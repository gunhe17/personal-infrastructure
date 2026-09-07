use clap::Subcommand;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// 최근 job 50개 — 배포·DB 생성 큐
    List,
    /// 주기 워커를 지금 한 번: ssl_renew | backup | monitor | gc
    Run { name: String },
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::List => list().await,
        Command::Run { name } => {
            client::post_empty(&format!("/jobs/run/{name}"), &()).await?;
            output::info(&format!("{name} 한 번 돌렸습니다"));

            Ok(())
        }
    }
}

async fn list() -> anyhow::Result<()> {
    let listed: Vec<contract::system::JobOutput> = client::get("/jobs").await?;

    if output::is_json() {
        return output::json(&listed);
    }

    let rows = listed
        .iter()
        .map(|job| {
            vec![
                job.created_at.format("%m-%d %H:%M:%S").to_string(),
                job.kind.clone(),
                job.status.clone(),
                job.attempts.to_string(),
                job.target_id.to_string(),
                job.error.clone().unwrap_or_default(),
            ]
        })
        .collect::<Vec<_>>();

    output::table(&["TIME", "KIND", "STATUS", "TRIES", "TARGET", "ERROR"], &rows);

    Ok(())
}
