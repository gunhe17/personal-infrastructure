use clap::Subcommand;
use uuid::Uuid;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// 환경변수 목록 — secret 은 마스킹
    List { project_id: Uuid },
    /// KEY=VALUE 를 넣거나 바꾼다. 반영은 다음 배포부터
    Set {
        project_id: Uuid,
        /// KEY=VALUE …
        #[arg(required = true)]
        pairs: Vec<String>,
        /// 목록에서 마스킹
        #[arg(long)]
        secret: bool,
    },
    /// 키 하나 제거
    Unset { project_id: Uuid, key: String },
    /// 평문 전부 — credential_read 스코프가 필요하다
    Reveal { project_id: Uuid },
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::List { project_id } => list(&format!("/projects/{project_id}/env")).await,
        Command::Reveal { project_id } => list(&format!("/projects/{project_id}/env/reveal")).await,
        Command::Set {
            project_id,
            pairs,
            secret,
        } => {
            let entries = pairs
                .iter()
                .map(|pair| {
                    let (key, value) = pair
                        .split_once('=')
                        .ok_or_else(|| anyhow::anyhow!("KEY=VALUE 형식이어야 합니다: {pair}"))?;

                    Ok(contract::project::EnvEntry {
                        key: key.to_owned(),
                        value: value.to_owned(),
                        secret,
                    })
                })
                .collect::<anyhow::Result<Vec<_>>>()?;

            let count = entries.len();
            client::put_empty(
                &format!("/projects/{project_id}/env"),
                &contract::project::EnvInput { entries },
            )
            .await?;
            output::info(&format!("{count}개 저장 — 다음 배포부터 반영됩니다"));

            Ok(())
        }
        Command::Unset { project_id, key } => {
            client::delete(&format!("/projects/{project_id}/env/{key}")).await?;
            output::info("제거했습니다");

            Ok(())
        }
    }
}

async fn list(path: &str) -> anyhow::Result<()> {
    let listed: Vec<contract::project::EnvOutput> = client::get(path).await?;

    if output::is_json() {
        return output::json(&listed);
    }

    let rows = listed
        .iter()
        .map(|env| {
            vec![
                env.key.clone(),
                env.value.clone(),
                if env.secret { "secret" } else { "" }.to_owned(),
            ]
        })
        .collect::<Vec<_>>();

    output::table(&["KEY", "VALUE", ""], &rows);

    Ok(())
}
