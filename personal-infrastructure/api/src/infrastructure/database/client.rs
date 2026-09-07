use std::sync::OnceLock;

use sqlx::PgPool;
use sqlx::postgres::PgListener;
use sqlx::postgres::PgPoolOptions;

use crate::shared::exception::AppError;

// #
// client

static POOL: OnceLock<PgPool> = OnceLock::new();

pub async fn connect(url: &str) -> Result<(), AppError> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(url)
        .await?;

    POOL.set(pool).ok();

    Ok(())
}

pub fn pool() -> &'static PgPool {
    POOL.get().expect("database not connected")
}

// #
// listen

/// 풀에서 빌리지 않는다 — 반납되는 순간 구독이 끊긴다.
pub async fn listen(channel: &str) -> Result<PgListener, AppError> {
    let mut listener = PgListener::connect(&crate::config::get().database_url).await?;
    listener.listen(channel).await?;

    Ok(listener)
}
