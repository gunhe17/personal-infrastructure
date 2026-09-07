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
pub use contract::deployment::PromoteInput as Input;

// #
// usecase

/// staging 이 빌드한 아티팩트를 prod 에 그대로 올린다 — 재빌드 없음. 같은 group 안에서만.
pub async fn promote(connection: &mut PgConnection, input: Input) -> Result<Output, AppError> {
    // find
    let source = repository::get_by_id(connection, input.deployment_id).await?;
    let from = project_repository::get_by_id(&mut *connection, source.project_id).await?;
    let to = project_repository::get_by_id(&mut *connection, input.target_project_id).await?;

    if from.group != to.group {
        return Err(DomainError::InvalidTransition {
            target: "Project",
            actual: format!("group 이 다릅니다 ({} → {})", from.group.to_str(), to.group.to_str()),
        })?;
    }

    let image_ref = source.image_ref.clone().ok_or(DomainError::InvalidTransition {
        target: "Deployment",
        actual: "이미지가 없습니다".to_owned(),
    })?;

    // build
    let mut deployment = Deployment::new(to.id, Trigger::Promote);
    deployment.image_ref = Some(image_ref);
    deployment.container_port = source.container_port;
    deployment.commit = source.commit.clone();
    deployment.stack = source.stack.clone();

    // persist
    repository::add(connection, &deployment).await?;
    project_repository::update_status(&mut *connection, to.id, ProjectStatus::Deploying).await?;

    // enqueue
    let job = Job::new(JobKind::Deploy, deployment.id);
    job_repository::enqueue(connection, &job).await?;

    // return
    Ok(deployment.to_output())
}
