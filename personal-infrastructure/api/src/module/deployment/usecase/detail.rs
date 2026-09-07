use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::deployment::domain::repository;
use crate::shared::exception::AppError;

pub use contract::deployment::Output;

// #
// usecase

pub async fn detail(connection: &mut PgConnection, id: Uuid) -> Result<Output, AppError> {
    // find
    let found = repository::get_by_id(connection, id).await?;

    // return
    let detailed = found.to_output();

    Ok(detailed)
}
