use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::webhook::domain::repository;
use crate::shared::exception::AppError;

pub use contract::webhook::Delivery as Output;

// #
// usecase

pub async fn deliveries(connection: &mut PgConnection, hook_id: Uuid) -> Result<Vec<Output>, AppError> {
    repository::list_deliveries(connection, hook_id).await
}
