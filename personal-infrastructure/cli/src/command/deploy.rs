use std::time::Duration;

use clap::Subcommand;
use uuid::Uuid;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// 배포 실행 — 감지 → 빌드 → 실행
    Start {
        project_id: Uuid,
        /// 로그를 따라가지 않고 바로 반환
        #[arg(long)]
        detach: bool,
    },
    /// 배포 이력
    List { project_id: Uuid },
    /// 배포 상세
    Show { id: Uuid },
    /// 이전 배포의 이미지를 그대로 다시 띄운다
    Rollback { deployment_id: Uuid },
    /// 다른 환경이 빌드한 이미지를 이 프로젝트에 올린다 — 재빌드 없음
    Promote {
        deployment_id: Uuid,
        target_project_id: Uuid,
    },
    /// 배포 로그 스트림
    Logs { id: Uuid },
    /// 큐에서 빼낸다 — 빌드가 시작됐으면 거부
    Cancel { id: Uuid },
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::Start { project_id, detach } => {
            let input = contract::deployment::StartInput { project_id };
            let started: contract::deployment::Output =
                client::post("/deployments", &input).await?;

            if output::is_json() {
                return output::json(&started);
            }

            output::info(&format!("배포 {} 를 큐에 넣었습니다", started.id));

            if detach {
                return Ok(());
            }

            follow(started.id).await
        }
        Command::Rollback { deployment_id } => {
            let input = contract::deployment::RollbackInput { deployment_id };
            let rolled: contract::deployment::Output =
                client::post("/deployments/rollback", &input).await?;

            if output::is_json() {
                return output::json(&rolled);
            }

            output::info(&format!("롤백 {} 를 큐에 넣었습니다", rolled.id));

            follow(rolled.id).await
        }
        Command::Promote {
            deployment_id,
            target_project_id,
        } => {
            let input = contract::deployment::PromoteInput {
                deployment_id,
                target_project_id,
            };
            let promoted: contract::deployment::Output =
                client::post("/deployments/promote", &input).await?;

            if output::is_json() {
                return output::json(&promoted);
            }

            output::info(&format!("승격 {} 를 큐에 넣었습니다", promoted.id));

            follow(promoted.id).await
        }
        Command::List { project_id } => {
            let listed: Vec<contract::deployment::Output> =
                client::get(&format!("/deployments?project_id={project_id}")).await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|deployment| {
                    vec![
                        deployment.id.to_string(),
                        contract::text::of(&deployment.status),
                        contract::text::of(&deployment.trigger),
                        deployment
                            .host_port
                            .map(|p| p.to_string())
                            .unwrap_or_else(|| "-".into()),
                        deployment.error.clone().unwrap_or_default(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["ID", "STATUS", "TRIGGER", "PORT", "ERROR"], &rows);

            Ok(())
        }
        Command::Show { id } => {
            let detailed: contract::deployment::Output =
                client::get(&format!("/deployments/{id}")).await?;

            if output::is_json() {
                return output::json(&detailed);
            }

            output::record(&[
                ("id", detailed.id.to_string()),
                ("status", contract::text::of(&detailed.status)),
                ("stack", detailed.stack.clone().unwrap_or_default()),
                ("image", detailed.image_ref.clone().unwrap_or_default()),
                (
                    "port",
                    detailed
                        .host_port
                        .map(|p| p.to_string())
                        .unwrap_or_default(),
                ),
                ("error", detailed.error.clone().unwrap_or_default()),
            ]);

            Ok(())
        }
        Command::Cancel { id } => {
            client::post_empty(&format!("/deployments/{id}/cancel"), &()).await?;
            output::info("취소했습니다");

            Ok(())
        }
        Command::Logs { id } => {
            client::stream_logs(&format!("/deployments/{id}/logs"), |line| {
                println!("{line}");
            })
            .await
        }
    }
}

// #
// follow

/// 로그를 끝까지 따라가고 최종 상태를 종료 코드로 돌려준다.
async fn follow(id: Uuid) -> anyhow::Result<()> {
    client::stream_logs(&format!("/deployments/{id}/logs"), |line| {
        println!("{line}");
    })
    .await?;

    // 스트림이 닫히고 상태가 반영되기까지의 짧은 간격을 준다
    tokio::time::sleep(Duration::from_millis(300)).await;

    let finished: contract::deployment::Output = client::get(&format!("/deployments/{id}")).await?;

    match finished.status {
        contract::deployment::Status::Running => {
            output::info(&format!(
                "성공 — http://127.0.0.1:{}",
                finished.host_port.unwrap_or(0)
            ));

            Ok(())
        }
        status => Err(anyhow::anyhow!(
            "배포 실패 ({status:?}): {}",
            finished.error.unwrap_or_default()
        )),
    }
}
