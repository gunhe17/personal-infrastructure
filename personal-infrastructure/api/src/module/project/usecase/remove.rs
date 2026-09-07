use sqlx::PgConnection;
use uuid::Uuid;

use crate::infrastructure::compose::client as compose;
use crate::infrastructure::docker;
use crate::module::project::domain::repository;
use crate::shared::exception::AppError;

// #
// usecase

pub async fn remove(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    // find
    let project = repository::get_by_id(&mut *connection, id).await?;

    // stop — compose 는 스택 전체를 내린다
    if project.is_compose() {
        compose::down(&project.container()).await;
    } else {
        docker::client::remove(&project.container()).await;
    }

    // release
    repository::release_ports(connection, id).await?;

    // persist
    repository::remove(connection, id).await?;

    Ok(())
}
