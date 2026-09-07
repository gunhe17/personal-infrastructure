use sqlx::PgConnection;

use crate::module::webhook::domain::repository;
use crate::module::webhook::domain::repository::Hook;
use crate::shared::exception::AppError;

pub use contract::webhook::Output;

// #
// usecase

pub async fn list(connection: &mut PgConnection) -> Result<Vec<Output>, AppError> {
    let listed = repository::list_all(connection).await?;

    Ok(listed.iter().map(Hook::to_output).collect())
}
