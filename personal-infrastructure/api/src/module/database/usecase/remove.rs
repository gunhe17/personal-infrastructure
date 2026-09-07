use sqlx::PgConnection;
use uuid::Uuid;

use crate::infrastructure::docker;
use crate::module::backup::domain::repository as backup_repository;
use crate::module::database::domain::repository;
use crate::module::project::domain::repository as project_repository;
use crate::shared::exception::AppError;

// #
// usecase

pub async fn remove(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    // find
    let instance = repository::get_by_id(connection, id).await?;

    // stop — 볼륨은 남긴다. 데이터를 지우는 것은 별도 결정이다
    docker::client::remove(&instance.container()).await;

    // release — 포트 예약과 이 DB 를 겨눈 백업 예약
    project_repository::release_port(connection, instance.host_port).await?;
    backup_repository::remove_schedules_for(&mut *connection, id).await?;
    repository::remove(connection, id).await?;

    Ok(())
}
