use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::project::domain::repository;
use crate::shared::exception::AppError;

pub use contract::project::LimitsInput as Input;

// #
// usecase

/// 다음 배포부터 적용 — `docker run` 인자라 돌고 있는 컨테이너는 못 바꾼다.
pub async fn limits(connection: &mut PgConnection, id: Uuid, input: Input) -> Result<(), AppError> {
    repository::get_by_id(&mut *connection, id).await?;

    repository::update_limits(connection, id, input.cpus, input.memory_mb.map(|mb| mb as i32)).await
}
