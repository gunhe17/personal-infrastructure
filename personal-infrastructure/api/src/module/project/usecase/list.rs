use sqlx::PgConnection;

use crate::module::project::domain::repository;
use crate::shared::exception::AppError;

pub use contract::project::Output;

// #
// usecase

pub async fn list(connection: &mut PgConnection) -> Result<Vec<Output>, AppError> {
    let listed = repository::list_all(connection).await?;

    Ok(listed.iter().map(|project| project.to_output()).collect())
}
