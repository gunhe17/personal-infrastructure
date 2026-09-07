use clap::Subcommand;
use uuid::Uuid;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// 나가는 웹훅 목록
    List,
    /// 이벤트에 URL 구독. deploy_succeeded | deploy_failed
    Create {
        event: String,
        url: String,
        /// 본문을 HMAC-SHA256 으로 서명한다 (X-PI-Signature)
        #[arg(long)]
        secret: Option<String>,
    },
    Remove { id: Uuid },
    /// 최근 전달 이력
    Deliveries { id: Uuid },
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::List => {
            let listed: Vec<contract::webhook::Output> = client::get("/hooks").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|hook| {
                    vec![
                        hook.id.to_string(),
                        contract::text::of(&hook.event),
                        hook.url.clone(),
                        if hook.signed { "signed" } else { "" }.to_owned(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["ID", "EVENT", "URL", ""], &rows);

            Ok(())
        }
        Command::Create { event, url, secret } => {
            let input = contract::webhook::CreateInput {
                event: contract::text::parse(&event)
                    .ok_or_else(|| anyhow::anyhow!("알 수 없는 이벤트: {event}"))?,
                url,
                secret,
            };
            let created: contract::webhook::Output = client::post("/hooks", &input).await?;

            if output::is_json() {
                return output::json(&created);
            }

            output::record(&[("id", created.id.to_string()), ("url", created.url)]);

            Ok(())
        }
        Command::Remove { id } => {
            client::delete(&format!("/hooks/{id}")).await?;
            output::info("제거했습니다");

            Ok(())
        }
        Command::Deliveries { id } => {
            let listed: Vec<contract::webhook::Delivery> =
                client::get(&format!("/hooks/{id}/deliveries")).await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|delivery| {
                    vec![
                        delivery.created_at.format("%m-%d %H:%M:%S").to_string(),
                        delivery.status.map(|s| s.to_string()).unwrap_or_else(|| "-".into()),
                        delivery.error.clone().unwrap_or_default(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["TIME", "STATUS", "ERROR"], &rows);

            Ok(())
        }
    }
}
