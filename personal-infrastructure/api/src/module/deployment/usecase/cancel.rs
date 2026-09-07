use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::common::exception::DomainError;
use crate::module::deployment::domain::repository;
use crate::module::job::domain::repository as job_repository;
use crate::module::project::domain::Status as ProjectStatus;
use crate::module::project::domain::repository as project_repository;
use crate::shared::exception::AppError;

// #
// usecase

/// 큐에서 빼낸다. 이미 빌드 중이면 거부 — 워커가 쥔 프로세스를 여기서 끊을 수 없다.
pub async fn cancel(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    let deployment = repository::get_by_id(connection, id).await?;

    if !repository::cancel(connection, id).await? {
        return Err(DomainError::InvalidTransition {
            target: "Deployment",
            actual: format!("{} — 큐에 있을 때만 취소할 수 있습니다", contract::text::of(&deployment.status)),
        })?;
    }

    job_repository::cancel_for_target(connection, id).await?;

    // 프로젝트 상태를 되돌린다 — 돌고 있는 배포가 있으면 running, 없으면 created
    let status = match repository::find_current(connection, deployment.project_id).await? {
        Some(_) => ProjectStatus::Running,
        None => ProjectStatus::Created,
    };
    project_repository::update_status(connection, deployment.project_id, status).await
}
