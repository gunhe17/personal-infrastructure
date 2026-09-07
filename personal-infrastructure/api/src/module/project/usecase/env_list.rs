use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::project::domain::repository;
use crate::shared::exception::AppError;

pub use contract::project::EnvOutput as Output;

// #
// usecase

/// secret 은 마스킹돼 나간다. 평문은 `env_reveal` — 그쪽은 `TokenScope` 를 요구한다.
pub async fn list(connection: &mut PgConnection, project_id: Uuid) -> Result<Vec<Output>, AppError> {
    repository::get_by_id(&mut *connection, project_id).await?;

    let listed = repository::list_env(connection, project_id).await?;

    Ok(listed.iter().map(|env| env.to_output(false)).collect())
}
