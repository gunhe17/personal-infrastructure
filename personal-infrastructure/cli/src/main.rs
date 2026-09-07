mod client;
mod command;
mod config;
mod output;

use clap::CommandFactory;
use clap::Parser;
use clap::Subcommand;
use clap_complete::Shell;

// #
// cli

#[derive(Parser)]
#[command(
    name = "pi",
    version,
    about = "personal-infrastructure — 홈서버 배포 도구"
)]
struct Cli {
    /// 기계용 JSON 출력 (stdout 은 데이터만)
    #[arg(long, global = true)]
    json: bool,

    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// 프로젝트
    #[command(subcommand)]
    Project(command::project::Command),
    /// 배포
    #[command(subcommand)]
    Deploy(command::deploy::Command),
    /// 도메인 · 인증서
    #[command(subcommand)]
    Domain(command::domain::Command),
    /// git 연결 · 푸시 투 디플로이
    #[command(subcommand)]
    Git(command::git::Command),
    /// 관리형 데이터베이스
    #[command(subcommand)]
    Database(command::database::Command),
    /// 백업 · 복원
    #[command(subcommand)]
    Backup(command::backup::Command),
    /// 자격증명 보관
    #[command(subcommand)]
    Credential(command::credential::Command),
    /// 볼륨
    #[command(subcommand)]
    Volume(command::volume::Command),
    /// 상태 · 문제 · 포트 · 감사
    #[command(subcommand)]
    Status(command::status::Command),
    /// API 토큰
    #[command(subcommand)]
    Token(command::token::Command),
    /// 서버 주소·토큰 설정
    #[command(subcommand)]
    Context(command::context::Command),
    /// 환경변수
    #[command(subcommand)]
    Env(command::env::Command),
    /// 엣지 — 경로 규칙, vhost, 리로드, 80/443 소유자
    #[command(subcommand)]
    Edge(command::edge::Command),
    /// 나가는 웹훅 — 배포 성공/실패 이벤트
    #[command(subcommand)]
    Webhook(command::webhook::Command),
    /// 박스 점검 — docker·DB·엣지·도구·워커
    Doctor,
    /// REST 직접 호출
    Api(command::api::Command),
    /// MCP 클라이언트 설정
    #[command(subcommand)]
    Mcp(command::mcp::Command),
    /// Cloudflare 터널 — 공인 IP·포트포워딩 없이 공개
    #[command(subcommand)]
    Tunnel(command::tunnel::Command),
    /// 기존 컨테이너 흡수
    #[command(subcommand)]
    Adopt(command::adopt::Command),
    /// job 큐 · 주기 워커 즉시 실행
    #[command(subcommand)]
    Job(command::job::Command),
    /// 메일 서버 (Stalwart)
    #[command(subcommand)]
    Mail(command::mail::Command),
    /// systemd 유닛 설치 (root)
    Install(command::install::Install),
    /// systemd 유닛 제거 — 데이터는 남는다
    Uninstall,
    /// 대시보드를 브라우저로
    Open,
    /// 셸 자동완성 스크립트 생성
    Completion { shell: Shell },
}

// #
// run

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    output::set_json(cli.json);

    let outcome = match cli.command {
        Command::Project(command) => command::project::run(command).await,
        Command::Deploy(command) => command::deploy::run(command).await,
        Command::Domain(command) => command::domain::run(command).await,
        Command::Git(command) => command::git::run(command).await,
        Command::Database(command) => command::database::run(command).await,
        Command::Backup(command) => command::backup::run(command).await,
        Command::Credential(command) => command::credential::run(command).await,
        Command::Volume(command) => command::volume::run(command).await,
        Command::Status(command) => command::status::run(command).await,
        Command::Token(command) => command::token::run(command).await,
        Command::Context(command) => command::context::run(command).await,
        Command::Env(command) => command::env::run(command).await,
        Command::Edge(command) => command::edge::run(command).await,
        Command::Webhook(command) => command::webhook::run(command).await,
        Command::Doctor => command::doctor::run().await,
        Command::Api(command) => command::api::run(command).await,
        Command::Mcp(command) => command::mcp::run(command).await,
        Command::Tunnel(command) => command::tunnel::run(command).await,
        Command::Adopt(command) => command::adopt::run(command).await,
        Command::Job(command) => command::job::run(command).await,
        Command::Mail(command) => command::mail::run(command).await,
        Command::Install(command) => command::install::install(command).await,
        Command::Uninstall => command::install::uninstall().await,
        Command::Open => {
            let url = format!("{}/ui/", config::api_url());
            let opener = if cfg!(target_os = "macos") { "open" } else { "xdg-open" };
            std::process::Command::new(opener).arg(&url).status().map(drop).map_err(Into::into)
        }
        Command::Completion { shell } => {
            clap_complete::generate(shell, &mut Cli::command(), "pi", &mut std::io::stdout());

            Ok(())
        }
    };

    if let Err(error) = outcome {
        eprintln!("오류: {error}");
        std::process::exit(1);
    }
}
