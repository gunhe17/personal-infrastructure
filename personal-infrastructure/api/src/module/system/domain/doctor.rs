use sqlx::PgPool;

use contract::system::Check;

use crate::config;
use crate::infrastructure::docker;
use crate::infrastructure::edge::client as edge;
use crate::infrastructure::host::client as host;
use crate::infrastructure::process;
use crate::module::job::domain::repository as job_repository;
use crate::module::monitoring::domain::repository as monitoring_repository;

// #
// doctor

/// 박스가 배포를 받을 수 있는 상태인지. 실패 하나하나가 "무엇을 고쳐야 하는지"를 말한다.
pub async fn run(pool: &PgPool) -> Vec<Check> {
    let config = config::get();
    let mut checks = Vec::new();

    checks.push(match config::Platform::current() {
        config::Platform::Linux => ok("platform", "linux — 엣지는 호스트 네트워크, 데몬은 systemd"),
        config::Platform::Mac => ok(
            "platform",
            "mac — 엣지는 :80/:443 publish + host.docker.internal, 데몬은 LaunchAgent. Docker Desktop/OrbStack 은 로그인 세션이 필요하니 자동 로그인을 켜두세요",
        ),
    });

    checks.push(check(
        "docker",
        process::output("docker", ["version", "--format", "{{.Server.Version}}"]).await,
        |version| format!("서버 {}", version.trim()),
        "docker 데몬에 못 붙습니다 — 설치돼 있고 이 사용자가 docker 그룹에 있는지",
    ));

    checks.push(match sqlx::query!("select 1 as one").fetch_one(pool).await {
        Ok(_) => ok("database", "연결됨"),
        Err(error) => fail("database", &format!("{error}")),
    });

    checks.push(match tokio::fs::metadata(&config.work_dir).await {
        Ok(meta) if meta.is_dir() => ok("work_dir", &config.work_dir.display().to_string()),
        _ => fail("work_dir", &format!("{} 가 없습니다", config.work_dir.display())),
    });

    checks.push(match tokio::fs::metadata(&config.secret_key).await {
        Ok(_) => ok("secret_key", "age 키 있음 — 백업해 두세요"),
        Err(_) => fail("secret_key", "age 키가 없습니다. 서버가 한 번은 떠야 만들어집니다"),
    });

    for tool in ["git", "openssl", "lsof", "certbot"] {
        let found = process::output("sh", ["-c", &format!("command -v {tool}")]).await;
        checks.push(match found {
            Ok(path) => ok(tool, path.trim()),
            Err(_) if tool == "certbot" => fail(tool, "없음 — Let's Encrypt 대신 self_signed 만 됩니다"),
            Err(_) => fail(tool, "없음"),
        });
    }

    // edge — 우리 것이 떠 있거나, 아무도 안 잡고 있거나
    let edge_running = docker::client::is_running(edge::CONTAINER).await;
    let owners = host::edge_port_owner().await;
    checks.push(if edge_running {
        ok("edge", "pi-edge 가 :80/:443 을 잡고 있음")
    } else if owners.is_empty() {
        ok("edge", "비어 있음 — 첫 도메인을 붙이면 뜹니다")
    } else {
        let names: Vec<String> = owners
            .iter()
            .map(|owner| format!("{}(:{})", owner.process, owner.port))
            .collect();
        fail("edge", &format!("{} 가 :80/:443 을 잡고 있습니다 — 내리거나 사이트를 옮기세요", names.join(", ")))
    });

    // worker — job 이 쌓이는데 아무도 안 집어가면 워커가 죽은 것
    checks.push(match job_repository::count_stale_pending(pool).await {
        Ok(0) => ok("worker", "job 큐 정상"),
        Ok(stale) => fail("worker", &format!("60초 넘게 대기 중인 job {stale}개 — 워커가 도는지 확인")),
        Err(error) => fail("worker", &format!("{error}")),
    });

    checks.push(match monitoring_repository::count_open(pool).await {
        Ok(0) => ok("incidents", "열린 문제 없음"),
        Ok(open) => fail("incidents", &format!("열린 문제 {open}개 — `status issues`")),
        Err(error) => fail("incidents", &format!("{error}")),
    });

    checks
}

fn check<T>(
    name: &str,
    outcome: Result<T, impl std::fmt::Display>,
    describe: impl FnOnce(T) -> String,
    hint: &str,
) -> Check {
    match outcome {
        Ok(value) => ok(name, &describe(value)),
        Err(error) => fail(name, &format!("{hint} ({error})")),
    }
}

fn ok(name: &str, detail: &str) -> Check {
    Check { name: name.to_owned(), ok: true, detail: detail.to_owned() }
}

fn fail(name: &str, detail: &str) -> Check {
    Check { name: name.to_owned(), ok: false, detail: detail.to_owned() }
}
