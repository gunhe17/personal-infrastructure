use sqlx::PgConnection;
use uuid::Uuid;

use crate::infrastructure::database;
use crate::module::certificate::domain::issue;
use crate::module::domain_name::domain::repository;
use crate::shared::exception::AppError;

// #
// usecase

/// 지금 발급 — 워커의 다음 주기를 기다리지 않는다. 같은 `issue` 경로.
pub async fn ssl(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    let domain = repository::get_by_id(connection, id).await?;

    issue::issue(database::pool(), &domain.host, domain.tls_mode).await
}
