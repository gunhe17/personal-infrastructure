use sqlx::PgConnection;
use uuid::Uuid;

use crate::infrastructure::docker;
use crate::module::common::exception::DomainError;
use crate::module::common::secret::Secret;
use crate::module::deployment::domain::Deployment;
use crate::module::deployment::domain::Trigger;
use crate::module::deployment::domain::repository as deployment_repository;
use crate::module::job::domain::Job;
use crate::module::job::domain::JobKind;
use crate::module::job::domain::repository as job_repository;
use crate::module::migration::domain::foreign;
use crate::module::project::domain::Env;
use crate::module::project::domain::Key;
use crate::module::project::domain::Name;
use crate::module::project::domain::Port;
use crate::module::project::domain::Project;
use crate::module::project::domain::Source;
use crate::module::project::domain::Status as ProjectStatus;
use crate::module::project::domain::repository as project_repository;
use crate::module::volume::domain::repository as volume_repository;
use crate::shared::exception::AppError;

pub use contract::migration::AdoptInput as Input;
pub use contract::project::Output;

// #
// usecase

/// 돌고 있는 컨테이너를 프로젝트로 — 이미지·env·마운트를 그대로 물려받고, 포트는 루프백 예약대장에서.
/// 옛 컨테이너는 배포 워커가 같은 이름으로 다시 띄울 때 교체된다. 데이터는 볼륨에 있으니 그대로.
pub async fn adopt(connection: &mut PgConnection, input: Input) -> Result<Output, AppError> {
    // inspect
    let inspected = docker::client::inspect(&input.container).await?;
    let found = foreign::from_inspect(&input.container, &inspected);

    let container_port = found
        .ports
        .first()
        .map(|map| Port::from_u16(map.container))
        .transpose()?
        .ok_or(DomainError::InvalidTransition {
            target: "Adopt",
            actual: "컨테이너가 노출한 포트가 없습니다 — 웹 앱이 아니면 흡수할 수 없습니다".to_owned(),
        })?;

    // build
    let name = Name::from_str(&input.name.unwrap_or_else(|| foreign::project_name(&found.name)))?;
    let project = Project::new(
        name,
        None,
        None,
        Source::from_parts(contract::project::SourceKind::Image, &found.image)?,
        Some(container_port),
    );

    // persist — 프로젝트, env, 볼륨
    project_repository::add(connection, &project).await?;

    let env: Vec<Env> = found
        .env
        .iter()
        .filter_map(|pair| pair.split_once('='))
        .filter_map(|(key, value)| {
            Key::from_str(key).ok().map(|key| Env {
                key,
                value: Secret::from_str(value),
                secret: false,
            })
        })
        .collect();

    if !env.is_empty() {
        project_repository::upsert_env(connection, project.id, &env).await?;
    }

    for mount in &found.mounts {
        if let Some((source, target)) = mount.split_once(':') {
            volume_repository::add(
                connection,
                &contract::volume::Output {
                    id: Uuid::new_v4(),
                    project_id: Some(project.id),
                    name: source.to_owned(),
                    mount_path: target.to_owned(),
                },
            )
            .await?;
        }
    }

    // 옛 이름을 우리 이름으로 — 워커가 같은 이름으로 다시 띄우며 교체한다
    if found.name != project.name.to_str() {
        docker::client::remove(&found.name).await;
    }

    // enqueue
    let deployment = Deployment::new(project.id, Trigger::Manual);
    deployment_repository::add(connection, &deployment).await?;
    project_repository::update_status(&mut *connection, project.id, ProjectStatus::Deploying).await?;
    job_repository::enqueue(connection, &Job::new(JobKind::Deploy, deployment.id)).await?;

    Ok(project.to_output())
}
