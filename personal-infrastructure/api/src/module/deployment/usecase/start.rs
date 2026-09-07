use sqlx::PgConnection;

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
pub use contract::deployment::StartInput as Input;

// #
// usecase

/// 빌드는 요청 안에서 돌지 않는다 — job 을 넣고 즉시 반환한다 [INV-13].
pub async fn start(connection: &mut PgConnection, input: Input) -> Result<Output, AppError> {
    // find
    let project = project_repository::get_by_id(&mut *connection, input.project_id).await?;

    // build
    let deployment = Deployment::new(project.id, Trigger::Manual);

    // persist
    repository::add(connection, &deployment).await?;
    project_repository::update_status(&mut *connection, project.id, ProjectStatus::Deploying).await?;

    // enqueue
    let job = Job::new(JobKind::Deploy, deployment.id);
    job_repository::enqueue(connection, &job).await?;

    // return
    let started = deployment.to_output();

    Ok(started)
}
