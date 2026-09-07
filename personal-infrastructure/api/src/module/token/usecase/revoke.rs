use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::token::domain::repository;
use crate::shared::exception::AppError;

// #
// usecase

pub async fn revoke(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    repository::revoke(connection, id).await?;

    Ok(())
}
