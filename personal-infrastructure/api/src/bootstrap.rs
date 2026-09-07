use tokio::signal;
use tracing_subscriber::EnvFilter;

use crate::config;
use crate::infrastructure::cipher::client as cipher;
use crate::infrastructure::database;

// #
// init

pub async fn init(name: &'static str) -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with_target(false)
        .init();

    tokio::fs::create_dir_all(&config::get().work_dir).await?;
    cipher::init(&config::get().secret_key).await?;
    database::connect(&config::get().database_url).await?;

    // 스키마는 데몬이 스스로 맞춘다 — 설치 단계가 따로 없다
    sqlx::migrate!().run(database::pool()).await?;

    tracing::info!(
        process = name,
        version = env!("CARGO_PKG_VERSION"),
        "started"
    );

    Ok(())
}

// #
// shutdown

pub async fn shutdown() {
    let interrupt = async {
        signal::ctrl_c().await.ok();
    };

    #[cfg(unix)]
    let terminate = async {
        match signal::unix::signal(signal::unix::SignalKind::terminate()) {
            Ok(mut stream) => {
                stream.recv().await;
            }
            Err(_) => std::future::pending::<()>().await,
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = interrupt => {}
        _ = terminate => {}
    }

    tracing::info!("shutdown signal");
}
