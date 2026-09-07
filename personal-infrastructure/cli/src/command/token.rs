use clap::Subcommand;
use contract::token::Scope;
use uuid::Uuid;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// 토큰 목록
    List,
    /// 토큰 발급 — 평문은 이때 한 번만 보인다
    Create {
        name: String,
        /// project_read, project_write, deploy, token_admin, system_admin
        #[arg(long, value_delimiter = ',', required = true)]
        scope: Vec<String>,
    },
    /// 토큰 폐기
    Revoke { id: Uuid },
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::List => {
            let listed: Vec<contract::token::Output> = client::get("/tokens").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|token| {
                    vec![
                        token.id.to_string(),
                        token.name.clone(),
                        token
                            .scopes
                            .iter()
                            .map(Scope::as_str)
                            .collect::<Vec<_>>()
                            .join(","),
                        if token.revoked_at.is_some() {
                            "revoked"
                        } else {
                            "active"
                        }
                        .to_owned(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["ID", "NAME", "SCOPES", "STATE"], &rows);

            Ok(())
        }
        Command::Create { name, scope } => {
            let scopes = scope
                .iter()
                .map(|value| {
                    contract::text::parse::<Scope>(value)
                        .ok_or_else(|| anyhow::anyhow!("알 수 없는 스코프: {value}"))
                })
                .collect::<anyhow::Result<Vec<_>>>()?;

            let input = contract::token::CreateInput { name, scopes };
            let created: contract::token::Created = client::post("/tokens", &input).await?;

            if output::is_json() {
                return output::json(&created);
            }

            output::record(&[
                ("id", created.token.id.to_string()),
                ("name", created.token.name.clone()),
                ("secret", created.secret.clone()),
            ]);
            output::info("secret 은 다시 표시되지 않습니다");

            Ok(())
        }
        Command::Revoke { id } => {
            client::delete(&format!("/tokens/{id}")).await?;
            output::info("폐기했습니다");

            Ok(())
        }
    }
}
