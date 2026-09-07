use sqlx::PgConnection;

use crate::module::domain_name::domain::repository;
use crate::shared::exception::AppError;

pub use contract::domain_name::Output;

// #
// usecase

pub async fn list(connection: &mut PgConnection) -> Result<Vec<Output>, AppError> {
    let listed = repository::list_all(connection).await?;

    Ok(listed.iter().map(Attached::to_output).collect())
}

use crate::module::domain_name::domain::repository::Attached;
