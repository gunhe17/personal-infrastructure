use clap::Args;

use crate::client;

// #
// command

/// REST 를 직접 친다 — 스크립트와 MCP 디버깅용. 응답 본문은 그대로 stdout.
#[derive(Args)]
pub struct Command {
    /// GET | POST | PUT | DELETE
    method: String,
    /// `/projects` 처럼 앞에 / 를 붙인 경로
    path: String,
    /// JSON 본문
    #[arg(long)]
    body: Option<String>,
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    let body = command
        .body
        .as_deref()
        .map(serde_json::from_str::<serde_json::Value>)
        .transpose()?;

    let (status, text) = client::raw(&command.method.to_uppercase(), &command.path, body).await?;

    eprintln!("{status}");
    println!("{text}");

    if status >= 400 {
        std::process::exit(1);
    }

    Ok(())
}
