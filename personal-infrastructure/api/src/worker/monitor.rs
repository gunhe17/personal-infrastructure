use crate::config;
use crate::infrastructure::database;
use crate::module::analytics::domain::ingest;
use crate::module::analytics::domain::usage;
use crate::module::monitoring::domain::scan;
use crate::shared::exception::AppError;
use crate::worker;

// #
// run

pub async fn run() {
    worker::repeat("monitor", config::every(30), tick).await
}

pub async fn tick() -> Result<(), AppError> {
    scan::run(database::pool()).await?;

    // 요청 통계·자원 샘플은 감시와 같은 주기 — 실패해도 감시를 막지 않는다
    if let Err(error) = ingest::run(database::pool()).await {
        tracing::warn!(%error, "analytics ingest");
    }
    if let Err(error) = usage::sample(database::pool()).await {
        tracing::warn!(%error, "usage sample");
    }

    Ok(())
}
