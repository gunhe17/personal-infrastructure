use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::project::domain::Key;
use crate::module::project::domain::repository;
use crate::shared::exception::AppError;

// #
// usecase

pub async fn unset(connection: &mut PgConnection, project_id: Uuid, key: &str) -> Result<(), AppError> {
    repository::remove_env(connection, project_id, &Key::from_str(key)?).await
}
