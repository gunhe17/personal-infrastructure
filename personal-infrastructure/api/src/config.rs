use std::path::PathBuf;
use std::sync::LazyLock;

// #
// platform

/// 리눅스는 엣지가 호스트 네트워크를 쓰고, Mac(Docker Desktop·OrbStack)은 포트를 publish 하고
/// `host.docker.internal` 로 호스트 루프백에 닿는다. 나머지는 같다.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Platform {
    Linux,
    Mac,
}

impl Platform {
    pub fn current() -> Self {
        if cfg!(target_os = "macos") { Self::Mac } else { Self::Linux }
    }

    /// 엣지 컨테이너에서 앱(호스트 루프백)에 닿는 주소.
    pub fn upstream_host(self) -> &'static str {
        match self {
            Self::Linux => "127.0.0.1",
            Self::Mac => "host.docker.internal",
        }
    }
}

// #
// config

pub struct AppConfig {
    pub port: u16,
    pub database_url: String,
    pub work_dir: PathBuf,
    /// 비밀값 봉인 키(age). 없으면 첫 기동 때 만든다.
    pub secret_key: PathBuf,
    /// Let's Encrypt 가 기본. ZeroSSL 등은 디렉터리 URL 과 EAB 로.
    pub acme_directory: Option<String>,
    pub acme_eab: Option<(String, String)>,
    /// e2e 용 — 주기 워커(ssl_renew·backup·monitor·gc)를 5초마다 돌린다
    pub worker_fast: bool,
    /// 대시보드 정적 파일. 없으면 API 만 뜬다
    pub wui_dir: Option<PathBuf>,
}

impl AppConfig {
    fn from_env() -> Self {
        // Mac 은 /tmp 가 재부팅에 비워진다 — 사용자 폴더 아래로
        let work_dir = env("PI_WORK_DIR").map(PathBuf::from).unwrap_or_else(|| match Platform::current() {
            Platform::Mac => PathBuf::from(env("HOME").unwrap_or_else(|| "/tmp".into()))
                .join("Library/Application Support/personal-infrastructure"),
            Platform::Linux => PathBuf::from("/var/lib/personal-infrastructure"),
        });

        Self {
            port: env("PI_PORT").and_then(|v| v.parse().ok()).unwrap_or(7878),
            database_url: env("DATABASE_URL").unwrap_or_else(|| {
                "postgres://pi:devpass@127.0.0.1:55432/personal_infrastructure".into()
            }),
            secret_key: env("PI_SECRET_KEY")
                .map(PathBuf::from)
                .unwrap_or_else(|| work_dir.join("age.key")),
            acme_directory: env("PI_ACME_DIRECTORY"),
            acme_eab: env("PI_ACME_EAB_KID").zip(env("PI_ACME_EAB_HMAC")),
            worker_fast: env("PI_WORKER_FAST").is_some(),
            wui_dir: env("PI_WUI_DIR").map(PathBuf::from).or_else(|| {
                // 바이너리 옆 wui/ — pi install 이 dist 를 거기 둔다
                std::env::current_exe()
                    .ok()
                    .and_then(|exe| exe.parent().map(|dir| dir.join("wui")))
                    .filter(|dir| dir.join("index.html").is_file())
            }),
            work_dir,
        }
    }
}

static CONFIG: LazyLock<AppConfig> = LazyLock::new(AppConfig::from_env);

pub fn get() -> &'static AppConfig {
    &CONFIG
}

fn env(key: &str) -> Option<String> {
    std::env::var(key).ok().filter(|value| !value.is_empty())
}

/// 주기 워커의 간격. `PI_WORKER_FAST` 면 전부 5초 — 테스트가 기다릴 수 있게.
pub fn every(seconds: u64) -> std::time::Duration {
    std::time::Duration::from_secs(if get().worker_fast { 5 } else { seconds })
}
