pub mod backup;
pub mod database;
pub mod deploy;
pub mod gc;
pub mod monitor;
pub mod ssl_renew;

use std::time::Duration;

use tokio::time::MissedTickBehavior;

use crate::shared::exception::AppError;

// #
// repeat

pub async fn repeat<F, Fut>(name: &'static str, every: Duration, tick: F)
where
    F: Fn() -> Fut,
    Fut: Future<Output = Result<(), AppError>>,
{
    let mut ticker = tokio::time::interval(every);
    ticker.set_missed_tick_behavior(MissedTickBehavior::Delay);

    loop {
        ticker.tick().await;

        // 한 틱의 실패가 루프를 끝내지 않는다 — 끝나면 그 종류의 작업이 전부 멈춘다
        if let Err(error) = tick().await {
            tracing::error!(worker = name, %error);
        }
    }
}
