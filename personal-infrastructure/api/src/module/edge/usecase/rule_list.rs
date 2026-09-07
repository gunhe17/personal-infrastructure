use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::edge::domain::repository;
use crate::shared::exception::AppError;

pub use contract::edge::RuleOutput as Output;

// #
// usecase

pub async fn list(connection: &mut PgConnection, domain_id: Option<Uuid>) -> Result<Vec<Output>, AppError> {
    repository::list(connection, domain_id).await
}
