use sqlx::PgPool;

use crate::infrastructure::docker;
use crate::infrastructure::edge::client as edge;
use crate::infrastructure::host::client as host;
use crate::module::monitoring::domain::repository;
use crate::shared::exception::AppError;

// #
// sweep

/// 관측(스캔)과 예약대장(DB)을 대조한다. 둘은 서로 다른 사실이라
/// 한쪽으로 덮어쓰지 않고 불일치를 인시던트로 올린다 [INV-9].
pub async fn run(pool: &PgPool) -> Result<(), AppError> {
    check_containers(pool).await?;
    check_ports(pool).await?;
    check_edge(pool).await?;

    Ok(())
}

async fn check_containers(pool: &PgPool) -> Result<(), AppError> {
    let managed = docker::client::list_managed().await.unwrap_or_default();
    let names: Vec<String> = managed.iter().map(|(name, _)| name.clone()).collect();
    repository::close_except(pool, "container", &names).await?;

    for (name, state) in managed {
        if state == "running" {
            repository::close(pool, "container", &name).await?;

            continue;
        }

        repository::open(
            pool,
            "container",
            &name,
            "warning",
            &format!("컨테이너가 멈춰 있습니다 (실제: {state})"),
        )
        .await?;
    }

    Ok(())
}

async fn check_ports(pool: &PgPool) -> Result<(), AppError> {
    let listeners = host::scan_listeners().await;
    let claims = sqlx::query!("select port, reason from host_port_claim")
        .fetch_all(pool)
        .await?;
    let subjects: Vec<String> = claims.iter().map(|claim| claim.port.to_string()).collect();
    repository::close_except(pool, "port", &subjects).await?;

    for claim in claims {
        let port = claim.port as u16;
        let subject = port.to_string();

        if listeners.iter().any(|listener| listener.port == port) {
            repository::close(pool, "port", &subject).await?;

            continue;
        }

        repository::open(
            pool,
            "port",
            &subject,
            "info",
            &format!(
                "예약된 포트를 아무도 듣고 있지 않습니다 (예약: {})",
                claim.reason
            ),
        )
        .await?;
    }

    // 외부에 열린 포트 — 앱 포트 비공개 원칙에서 벗어난 것을 알린다. 닫히면 인시던트도 닫는다
    let exposed: Vec<String> = listeners
        .iter()
        .filter(|l| l.public && l.port != 80 && l.port != 443)
        .map(|l| l.port.to_string())
        .collect();
    repository::close_except(pool, "exposure", &exposed).await?;

    for listener in listeners.iter().filter(|l| l.public) {
        if listener.port == 80 || listener.port == 443 {
            continue;
        }

        repository::open(
            pool,
            "exposure",
            &listener.port.to_string(),
            "warning",
            &format!(
                "{}:{} 가 외부에 열려 있습니다 ({})",
                listener.address, listener.port, listener.process
            ),
        )
        .await?;
    }

    Ok(())
}

async fn check_edge(pool: &PgPool) -> Result<(), AppError> {
    let routed = sqlx::query!("select count(*) as count from domain_name")
        .fetch_one(pool)
        .await?
        .count
        .unwrap_or(0);

    if routed == 0 {
        repository::close(pool, "edge", "openresty").await?;

        return Ok(());
    }

    if docker::client::is_running(edge::CONTAINER).await {
        repository::close(pool, "edge", "openresty").await?;

        return Ok(());
    }

    repository::open(
        pool,
        "edge",
        "openresty",
        "critical",
        "도메인이 붙어 있는데 엣지가 떠 있지 않습니다 — 모든 도메인이 응답하지 않습니다",
    )
    .await?;

    Ok(())
}
