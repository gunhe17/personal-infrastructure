use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::common::secret::Secret;
use crate::module::project::domain::Env;
use crate::module::project::domain::Key;
use crate::module::project::domain::repository;
use crate::shared::exception::AppError;

pub use contract::project::EnvInput as Input;

// #
// usecase

/// 반영은 다음 배포부터 — 돌고 있는 컨테이너는 그대로다. restart 가 stale 을 알려준다.
pub async fn set(connection: &mut PgConnection, project_id: Uuid, input: Input) -> Result<(), AppError> {
    repository::get_by_id(&mut *connection, project_id).await?;

    // build
    let entries = input
        .entries
        .iter()
        .map(|entry| {
            Ok(Env {
                key: Key::from_str(&entry.key)?,
                value: Secret::from_str(&entry.value),
                secret: entry.secret,
            })
        })
        .collect::<Result<Vec<_>, AppError>>()?;

    // persist
    repository::upsert_env(connection, project_id, &entries).await
}
