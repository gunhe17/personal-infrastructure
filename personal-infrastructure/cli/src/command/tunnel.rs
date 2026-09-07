use clap::Subcommand;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// cloudflared 를 띄운다. 토큰은 한 번만 넘기면 봉인해 둔다
    Up {
        #[arg(long)]
        token: Option<String>,
    },
    /// 내린다 — 토큰은 남는다
    Down,
    Status,
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::Up { token } => {
            let status: contract::tunnel::Status =
                client::post("/tunnel", &contract::tunnel::UpInput { token }).await?;

            if output::is_json() {
                return output::json(&status);
            }

            let target = if cfg!(target_os = "macos") { "http://host.docker.internal:80" } else { "http://localhost:80" };
            output::info(&format!("터널이 떴습니다 — Cloudflare 대시보드에서 공개 호스트를 {target} 으로 향하게 하세요"));

            Ok(())
        }
        Command::Down => {
            client::post_empty("/tunnel/down", &()).await?;
            output::info("내렸습니다");

            Ok(())
        }
        Command::Status => {
            let status: contract::tunnel::Status = client::get("/tunnel").await?;

            if output::is_json() {
                return output::json(&status);
            }

            output::record(&[
                ("running", status.running.to_string()),
                ("configured", status.configured.to_string()),
            ]);

            Ok(())
        }
    }
}
