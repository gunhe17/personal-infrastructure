use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::deployment::domain::repository;
use crate::shared::exception::AppError;

pub use contract::deployment::Output;

// #
// usecase

pub async fn list(
    connection: &mut PgConnection,
    project_id: Uuid,
) -> Result<Vec<Output>, AppError> {
    let listed = repository::list_by_project(connection, project_id, 20).await?;

    Ok(listed
        .iter()
        .map(|deployment| deployment.to_output())
        .collect())
}
