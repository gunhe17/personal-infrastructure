use clap::Subcommand;
use uuid::Uuid;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// 자격증명 목록 — 비밀값은 마스킹된다
    List,
    /// 자격증명 저장
    Create {
        name: String,
        kind: String,
        secret: String,
    },
    /// 평문 보기 — credential_read 스코프가 필요하다
    Reveal { id: Uuid },
    /// 삭제
    Remove { id: Uuid },
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::List => {
            let listed: Vec<contract::credential::Output> = client::get("/credentials").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|cred| {
                    vec![
                        cred.id.to_string(),
                        cred.name.clone(),
                        cred.kind.clone(),
                        cred.preview.clone(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["ID", "NAME", "KIND", "SECRET"], &rows);

            Ok(())
        }
        Command::Create { name, kind, secret } => {
            let input = contract::credential::CreateInput { name, kind, secret };
            let created: contract::credential::Output =
                client::post("/credentials", &input).await?;

            if output::is_json() {
                return output::json(&created);
            }

            output::record(&[("id", created.id.to_string()), ("name", created.name)]);

            Ok(())
        }
        Command::Reveal { id } => {
            let revealed: contract::credential::Revealed =
                client::get(&format!("/credentials/{id}/reveal")).await?;

            println!("{}", revealed.secret);

            Ok(())
        }
        Command::Remove { id } => {
            client::delete(&format!("/credentials/{id}")).await?;
            output::info("삭제했습니다");

            Ok(())
        }
    }
}
