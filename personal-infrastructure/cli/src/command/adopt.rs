use clap::Subcommand;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// 우리 라벨이 없는 컨테이너 — 흡수 후보
    Scan,
    /// 컨테이너를 프로젝트로 — 이미지·env·마운트 그대로, 포트는 루프백으로. 도메인은 따로 붙인다
    Container {
        container: String,
        #[arg(long)]
        name: Option<String>,
    },
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::Scan => {
            let listed: Vec<contract::migration::Foreign> = client::get("/migration/scan").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|foreign| {
                    vec![
                        foreign.name.clone(),
                        foreign.image.clone(),
                        foreign.state.clone(),
                        foreign
                            .ports
                            .iter()
                            .map(|p| format!("{}->{}", p.host, p.container))
                            .collect::<Vec<_>>()
                            .join(","),
                        foreign.mounts.len().to_string(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["CONTAINER", "IMAGE", "STATE", "PORTS", "MOUNTS"], &rows);

            Ok(())
        }
        Command::Container { container, name } => {
            let input = contract::migration::AdoptInput { container, name };
            let adopted: contract::project::Output = client::post("/migration/adopt", &input).await?;

            if output::is_json() {
                return output::json(&adopted);
            }

            output::record(&[("id", adopted.id.to_string()), ("name", adopted.name.clone())]);
            output::info("워커가 같은 이름으로 다시 띄웁니다 — `deploy list` 로 확인하고 `domain attach` 로 공개하세요");

            Ok(())
        }
    }
}
