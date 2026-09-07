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

/// restart 는 설정을 반영하지 않는다 — env 가 배포 뒤에 바뀌었으면 거부하고 배포를 돌리게 한다.
/// `force` 는 그걸 알고도 컨테이너만 튕기고 싶을 때.
pub async fn restart(connection: &mut PgConnection, id: Uuid, force: bool) -> Result<(), AppError> {
    let project = repository::get_by_id(&mut *connection, id).await?;

    let Some(current) = deployment_repository::find_current(connection, id).await? else {
        return Err(DomainError::InvalidTransition {
            target: "Project",
            actual: "배포된 적이 없습니다 — `deploy start` 먼저".to_owned(),
        })?;
    };

    if !force && project.env_stale_since(current.created_at) {
        return Err(DomainError::InvalidTransition {
            target: "Project",
            actual: "env 가 배포 뒤에 바뀌었습니다 — `deploy start` 로 반영하거나 --force".to_owned(),
        })?;
    }

    if project.is_compose() {
        compose::control(&project.container(), "restart").await?;
    } else {
        docker::client::restart(&project.container()).await?;
    }

    repository::update_status(connection, id, Status::Running).await
}
