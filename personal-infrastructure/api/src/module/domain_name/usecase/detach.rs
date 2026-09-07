use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::domain_name::domain::repository;
use crate::shared::exception::AppError;

// #
// usecase

pub async fn detach(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    repository::remove(connection, id).await?;

    Ok(())
}
