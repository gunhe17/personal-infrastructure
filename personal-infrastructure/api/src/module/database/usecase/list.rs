use sqlx::PgConnection;

use crate::module::database::domain::repository;
use crate::shared::exception::AppError;

pub use contract::database::Output;

// #
// usecase

pub async fn list(connection: &mut PgConnection) -> Result<Vec<Output>, AppError> {
    let listed = repository::list_all(connection).await?;

    Ok(listed.iter().map(|instance| instance.to_output()).collect())
}
