use sqlx::PgConnection;

use crate::module::common::exception::DomainError;
use crate::module::deployment::domain::Deployment;
use crate::module::deployment::domain::Trigger;
use crate::module::deployment::domain::repository;
use crate::module::job::domain::Job;
use crate::module::job::domain::JobKind;
use crate::module::job::domain::repository as job_repository;
use crate::module::project::domain::Status as ProjectStatus;
use crate::module::project::domain::repository as project_repository;
use crate::shared::exception::AppError;

pub use contract::deployment::Output;
pub use contract::deployment::RollbackInput as Input;

// #
// usecase

/// 박제해 둔 이미지 태그를 그대로 다시 띄운다 — 다시 빌드하지 않는다.
pub async fn rollback(connection: &mut PgConnection, input: Input) -> Result<Output, AppError> {
    // find
    let target = repository::get_by_id(connection, input.deployment_id).await?;

    let image_ref = target
        .image_ref
        .clone()
        .ok_or(DomainError::InvalidTransition {
            target: "Deployment",
            actual: "이미지가 없습니다".to_owned(),
        })?;

    // build — 감지 결과(컨테이너 포트)도 그대로 물려받는다
    let mut deployment = Deployment::new(target.project_id, Trigger::Rollback);
    deployment.image_ref = Some(image_ref);
    deployment.container_port = target.container_port;
    deployment.commit = target.commit.clone();
    deployment.stack = target.stack.clone();

    // persist
    repository::add(connection, &deployment).await?;
    project_repository::update_status(&mut *connection, target.project_id, ProjectStatus::Deploying)
        .await?;

    // enqueue
    let job = Job::new(JobKind::Deploy, deployment.id);
    job_repository::enqueue(connection, &job).await?;

    // return
    let rolled = deployment.to_output();

    Ok(rolled)
}
