use clap::Subcommand;
use uuid::Uuid;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// git 저장소를 프로젝트에 연결하고 웹훅 정보를 돌려준다
    Link {
        project_id: Uuid,
        repository: String,
        #[arg(long, default_value = "main")]
        branch: String,
        /// push 해도 자동 배포하지 않는다
        #[arg(long)]
        no_auto: bool,
    },
    /// 연결 해제
    Unlink { project_id: Uuid },
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::Link {
            project_id,
            repository,
            branch,
            no_auto,
        } => {
            let input = contract::git::LinkInput {
                project_id,
                repository,
                branch: Some(branch),
                auto_deploy: !no_auto,
            };
            let linked: contract::git::Output = client::post("/git/links", &input).await?;

            if output::is_json() {
                return output::json(&linked);
            }

            output::record(&[
                ("repository", linked.repository.clone()),
                ("branch", linked.branch.clone()),
                ("auto_deploy", linked.auto_deploy.to_string()),
                ("webhook", linked.webhook_path.clone()),
                ("secret", linked.webhook_secret.clone()),
            ]);
            output::info("GitHub → Settings → Webhooks 에 위 경로와 secret 을 등록하세요");

            Ok(())
        }
        Command::Unlink { project_id } => {
            client::delete(&format!("/git/links/{project_id}")).await?;
            output::info("해제했습니다");

            Ok(())
        }
    }
}
