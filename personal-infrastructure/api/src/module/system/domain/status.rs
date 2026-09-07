use sqlx::PgPool;

use crate::infrastructure::docker;
use crate::infrastructure::edge::client as edge;
use crate::infrastructure::host::client as host;
use crate::module::monitoring::domain::repository as monitoring_repository;
use crate::shared::exception::AppError;

// #
// status

pub async fn summarize(pool: &PgPool) -> Result<contract::system::Status, AppError> {
    let counts = sqlx::query!(
        r#"select
              (select count(*) from project where deleted_at is null) as projects,
              (select count(*) from project where status = 'running' and deleted_at is null) as running,
              (select count(*) from deployment where created_at > now() - interval '1 day') as today"#
    )
    .fetch_one(pool)
    .await?;

    Ok(contract::system::Status {
        version: env!("CARGO_PKG_VERSION").to_owned(),
        projects: counts.projects.unwrap_or(0),
        running: counts.running.unwrap_or(0),
        deployments_today: counts.today.unwrap_or(0),
        open_issues: monitoring_repository::count_open(pool).await?,
        edge_running: docker::client::is_running(edge::CONTAINER).await,
    })
}

// #
// port

/// 관측과 예약대장을 나란히 보여준다 — 어느 쪽도 상대를 덮어쓰지 않는다.
pub async fn port_claims(pool: &PgPool) -> Result<Vec<contract::system::PortClaim>, AppError> {
    let listeners = host::scan_listeners().await;
    let rows = sqlx::query!("select port, project_id, reason from host_port_claim order by port")
        .fetch_all(pool)
        .await?;

    Ok(rows
        .into_iter()
        .map(|row| contract::system::PortClaim {
            port: row.port as u16,
            project_id: row.project_id,
            reason: row.reason,
            listening: listeners.iter().any(|l| l.port == row.port as u16),
        })
        .collect())
}
