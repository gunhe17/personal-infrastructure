use crate::infrastructure::database;
use crate::module::edge::domain::reconcile;
use crate::shared::exception::AppError;

// #
// usecase

/// DB 기준으로 vhost 를 전부 다시 쓰고 리로드한다. 반환은 vhost 수.
pub async fn reload() -> Result<usize, AppError> {
    reconcile::run(database::pool()).await
}
