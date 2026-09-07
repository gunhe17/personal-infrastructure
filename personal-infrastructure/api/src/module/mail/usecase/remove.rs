use sqlx::PgConnection;

use crate::infrastructure::docker;
use crate::module::mail::CONTAINER;
use crate::shared::exception::AppError;

// #
// usecase

/// 컨테이너와 admin 포트 예약만 — 볼륨(메일함)은 남긴다.
pub async fn remove(connection: &mut PgConnection) -> Result<(), AppError> {
    docker::client::remove(CONTAINER).await;

    sqlx::query!("delete from host_port_claim where reason = 'mail:admin'")
        .execute(connection)
        .await?;

    Ok(())
}
