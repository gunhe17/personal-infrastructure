use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::webhook::domain::repository;
use crate::shared::exception::AppError;

// #
// usecase

pub async fn remove(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    repository::remove(connection, id).await
}
