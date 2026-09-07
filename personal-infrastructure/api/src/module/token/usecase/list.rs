use sqlx::PgConnection;

use crate::module::token::domain::repository;
use crate::shared::exception::AppError;

pub use contract::token::Output;

// #
// usecase

pub async fn list(connection: &mut PgConnection) -> Result<Vec<Output>, AppError> {
    let listed = repository::list_all(connection).await?;

    Ok(listed.iter().map(|token| token.to_output()).collect())
}
