use sqlx::PgConnection;
use uuid::Uuid;

use crate::infrastructure::compose::client as compose;
use crate::infrastructure::docker;
use crate::module::common::exception::DomainError;
use crate::module::deployment::domain::repository as deployment_repository;
use crate::module::project::domain::Status;
use crate::module::project::domain::repository;
use crate::shared::exception::AppError;

// #
// usecase

pub async fn start(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    let project = repository::get_by_id(&mut *connection, id).await?;

    // 컨테이너가 없으면 docker 오류(500)가 아니라 상태 오류(400)다
    if deployment_repository::find_current(connection, id).await?.is_none() {
        return Err(DomainError::InvalidTransition {
            target: "Project",
            actual: "배포된 적이 없습니다 — `deploy start` 먼저".to_owned(),
        })?;
    }

    if project.is_compose() {
        compose::control(&project.container(), "start").await?;
    } else {
        docker::client::start(&project.container()).await?;
    }

    repository::update_status(connection, id, Status::Running).await
}
