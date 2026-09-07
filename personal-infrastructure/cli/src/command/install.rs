use std::path::PathBuf;
use std::process::Command as Process;
use std::time::Duration;

use clap::Args;

use crate::config;
use crate::output;

const UNITS: [&str; 2] = ["pi-server", "pi-worker"];

// #
// command

/// 데몬 둘을 서비스로 등록하고 켠다 — 리눅스는 systemd, Mac 은 launchd(LaunchAgent). Postgres 는 이미 있어야 한다.
#[derive(Args)]
pub struct Install {
    /// postgres://user:pass@host:port/db
    #[arg(long)]
    database_url: String,
    /// 비우면 리눅스 /var/lib/personal-infrastructure, Mac ~/Library/Application Support/personal-infrastructure
    #[arg(long)]
    work_dir: Option<PathBuf>,
    #[arg(long, default_value_t = 7878)]
    port: u16,
    /// 데몬을 돌릴 리눅스 사용자 — docker 그룹에 있어야 한다
    #[arg(long, default_value = "root")]
    user: String,
    /// 대시보드 빌드(wui/dist). 비우면 바이너리 옆 wui/ 를 찾는다
    #[arg(long)]
    wui_dir: Option<PathBuf>,
}

// #
// install

pub async fn install(command: Install) -> anyhow::Result<()> {
    let bin_dir = std::env::current_exe()?
        .parent()
        .ok_or_else(|| anyhow::anyhow!("실행 파일 위치를 모르겠습니다"))?
        .to_path_buf();
    let work_dir = command.work_dir.clone().unwrap_or_else(default_work_dir);

    std::fs::create_dir_all(&work_dir)?;

    if cfg!(target_os = "macos") {
        install_launchd(&bin_dir, &work_dir, &command)?;
    } else {
        for (unit, binary) in UNITS.iter().zip(["server", "worker"]) {
            let path = format!("/etc/systemd/system/{unit}.service");
            let body = unit_file(unit, &bin_dir.join(binary), &work_dir, &command);

            std::fs::write(&path, body)
                .map_err(|error| anyhow::anyhow!("{path} 쓰기 실패 ({error}) — sudo 로 실행하세요"))?;
            output::info(&format!("wrote {path}"));
        }

        systemctl(&["daemon-reload"])?;
        systemctl(&["enable", "--now", UNITS[0], UNITS[1]])?;
    }

    // 첫 부팅이 토큰을 만든다 — 파일로 받아 컨텍스트에 넣고 지운다
    let api_url = format!("http://127.0.0.1:{}", command.port);
    wait_health(&api_url).await?;

    let token_path = work_dir.join("bootstrap.token");
    let mut context = config::load();
    context.api_url = Some(api_url);

    match std::fs::read_to_string(&token_path) {
        Ok(token) => {
            context.token = Some(token.trim().to_owned());
            std::fs::remove_file(&token_path).ok();
            output::info("부트스트랩 토큰을 컨텍스트에 저장했습니다");
        }
        Err(_) => output::info("부트스트랩 토큰 파일이 없습니다 — 이미 발급된 인스턴스면 `pi context set --token` 으로"),
    }

    config::save(&context)?;
    output::info(&format!("설치 완료: {}", config::path().display()));

    Ok(())
}

// #
// uninstall

/// 서비스 등록만 지운다 — 데이터·볼륨·컨테이너는 남는다.
pub async fn uninstall() -> anyhow::Result<()> {
    if cfg!(target_os = "macos") {
        for unit in UNITS {
            let plist = plist_path(unit);
            Process::new("launchctl")
                .args(["bootout", &format!("gui/{}", uid()), &plist.display().to_string()])
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .status()
                .ok();
            std::fs::remove_file(plist).ok();
        }
    } else {
        systemctl(&["disable", "--now", UNITS[0], UNITS[1]]).ok();

        for unit in UNITS {
            std::fs::remove_file(format!("/etc/systemd/system/{unit}.service")).ok();
        }

        systemctl(&["daemon-reload"])?;
    }

    output::info("서비스 등록을 지웠습니다. 데이터와 컨테이너는 그대로입니다");

    Ok(())
}

// #
// launchd (mac)

/// LaunchAgent — Docker Desktop/OrbStack 이 로그인 세션 안에서만 돌아서 Daemon 이 아니라 Agent 다.
fn install_launchd(bin_dir: &std::path::Path, work_dir: &std::path::Path, command: &Install) -> anyhow::Result<()> {
    let agents = home().join("Library/LaunchAgents");
    std::fs::create_dir_all(&agents)?;

    for (unit, binary) in UNITS.iter().zip(["server", "worker"]) {
        let plist = plist_path(unit);
        let body = format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>io.pi.{unit}</string>
  <key>ProgramArguments</key><array><string>{bin}</string></array>
  <key>EnvironmentVariables</key><dict>
    <key>DATABASE_URL</key><string>{db}</string>
    <key>PI_WORK_DIR</key><string>{work}</string>
    <key>PI_PORT</key><string>{port}</string>
{wui}    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>{work}/{unit}.log</string>
  <key>StandardErrorPath</key><string>{work}/{unit}.log</string>
</dict></plist>
"#,
            bin = bin_dir.join(binary).display(),
            db = command.database_url,
            work = work_dir.display(),
            port = command.port,
            wui = command.wui_dir.as_ref().map(|d| format!("    <key>PI_WUI_DIR</key><string>{}</string>\n", d.display())).unwrap_or_default(),
        );

        // 이전 등록이 있으면 내린다 — 없을 때의 불평은 삼킨다
        Process::new("launchctl")
            .args(["bootout", &format!("gui/{}", uid()), &plist.display().to_string()])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .ok();
        std::fs::write(&plist, body)?;

        let status = Process::new("launchctl")
            .args(["bootstrap", &format!("gui/{}", uid()), &plist.display().to_string()])
            .status()?;

        if !status.success() {
            anyhow::bail!("launchctl bootstrap {} 실패", plist.display());
        }

        output::info(&format!("loaded {}", plist.display()));
    }

    output::info("Mac mini 는 자동 로그인을 켜두세요 — Docker Desktop/OrbStack 과 이 Agent 는 로그인 세션 안에서 돕니다");

    Ok(())
}

fn plist_path(unit: &str) -> PathBuf {
    home().join(format!("Library/LaunchAgents/io.pi.{unit}.plist"))
}

fn home() -> PathBuf {
    PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| "/tmp".into()))
}

fn uid() -> String {
    Process::new("id")
        .arg("-u")
        .output()
        .ok()
        .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_owned())
        .unwrap_or_else(|| "501".into())
}

fn default_work_dir() -> PathBuf {
    if cfg!(target_os = "macos") {
        home().join("Library/Application Support/personal-infrastructure")
    } else {
        PathBuf::from("/var/lib/personal-infrastructure")
    }
}

fn unit_file(unit: &str, binary: &std::path::Path, work_dir: &std::path::Path, command: &Install) -> String {
    format!(
        "[Unit]\nDescription=personal-infrastructure {unit}\nAfter=network-online.target docker.service\nWants=network-online.target\n\n\
         [Service]\nUser={user}\nEnvironment=DATABASE_URL={db}\nEnvironment=PI_WORK_DIR={work_dir}\nEnvironment=PI_PORT={port}\n{wui}\
         ExecStart={bin}\nRestart=always\nRestartSec=2\n\n[Install]\nWantedBy=multi-user.target\n",
        user = command.user,
        db = command.database_url,
        work_dir = work_dir.display(),
        port = command.port,
        wui = command.wui_dir.as_ref().map(|d| format!("Environment=PI_WUI_DIR={}\n", d.display())).unwrap_or_default(),
        bin = binary.display(),
    )
}

fn systemctl(args: &[&str]) -> anyhow::Result<()> {
    let status = Process::new("systemctl").args(args).status()?;

    if !status.success() {
        anyhow::bail!("systemctl {} 실패", args.join(" "));
    }

    Ok(())
}

async fn wait_health(api_url: &str) -> anyhow::Result<()> {
    let client = reqwest::Client::new();

    for _ in 0..60 {
        if client
            .get(format!("{api_url}/health"))
            .send()
            .await
            .is_ok_and(|response| response.status().is_success())
        {
            return Ok(());
        }

        tokio::time::sleep(Duration::from_millis(500)).await;
    }

    anyhow::bail!("서버가 30초 안에 뜨지 않았습니다 — `journalctl -u pi-server`")
}
