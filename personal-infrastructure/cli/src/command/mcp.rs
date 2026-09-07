use clap::Subcommand;

use crate::config;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// MCP 클라이언트 설정 조각 — 지금 컨텍스트의 주소·토큰으로
    Config {
        /// 에이전트용 토큰. 비우면 컨텍스트 토큰(전권일 수 있으니 주의)
        #[arg(long)]
        token: Option<String>,
    },
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::Config { token } => {
            let token = token
                .or_else(config::token)
                .ok_or_else(|| anyhow::anyhow!("토큰이 없습니다 — `pi token create agent --scope project_read,project_write,deploy,domain_write`"))?;

            let snippet = serde_json::json!({
                "mcpServers": {
                    "personal-infrastructure": {
                        "type": "http",
                        "url": format!("{}/mcp", config::api_url()),
                        "headers": { "Authorization": format!("Bearer {token}") }
                    }
                }
            });

            output::json(&snippet)?;
            output::info("에이전트 토큰은 project_read,project_write,deploy,domain_write 만 — credential_read 는 MCP 에서 쓸 수 없다");

            Ok(())
        }
    }
}
