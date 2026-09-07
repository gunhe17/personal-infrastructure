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

/// 포트 예약은 그대로 둔다 — 다시 켤 때 같은 포트로 돌아온다.
pub async fn stop(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    let project = repository::get_by_id(&mut *connection, id).await?;

    // 컨테이너가 없으면 docker 오류(500)가 아니라 상태 오류(400)다
    if deployment_repository::find_current(connection, id).await?.is_none() {
        return Err(DomainError::InvalidTransition {
            target: "Project",
            actual: "배포된 적이 없습니다 — `deploy start` 먼저".to_owned(),
        })?;
    }

    if project.is_compose() {
        compose::control(&project.container(), "stop").await?;
    } else {
        docker::client::stop(&project.container()).await?;
    }

    repository::update_status(connection, id, Status::Stopped).await
}
