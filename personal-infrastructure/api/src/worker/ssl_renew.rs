use contract::domain_name::TlsMode;

use crate::config;
use crate::infrastructure::database;
use crate::module::certificate::domain::issue;
use crate::module::certificate::domain::repository;
use crate::module::domain_name::domain::repository as domain_repository;
use crate::module::edge::domain::reconcile;
use crate::shared::exception::AppError;
use crate::worker;

/// 만료 30일 전부터 갱신한다. 매번 전부 갱신하면 발급 rate limit 에 걸린다.
const RENEW_WINDOW_DAYS: i64 = 30;

// #
// run

pub async fn run() {
    worker::repeat("ssl_renew", config::every(6 * 3600), tick).await
}

pub async fn tick() -> Result<(), AppError> {
    let pool = database::pool();

    // issue — 인증서가 아직 없는 도메인
    let attached = domain_repository::list_routable(pool).await?;
    let mut changed = false;

    for domain in &attached {
        if matches!(domain.tls_mode, TlsMode::None | TlsMode::Manual) {
            continue;
        }

        if repository::find_by_host(pool, &domain.host)
            .await?
            .is_some()
        {
            continue;
        }

        // 앱이 뜬 뒤에 발급한다 — 인증서 실패가 배포를 죽이지 않는다
        if domain.upstream_port.is_none() {
            continue;
        }

        if issue::issue(pool, &domain.host, domain.tls_mode).await.is_ok() {
            changed = true;
        }
    }

    // renew — 만료가 창 안으로 들어온 것
    for certificate in repository::list_expiring(pool, RENEW_WINDOW_DAYS).await? {
        let mode = if certificate.issuer == "self-signed" {
            TlsMode::SelfSigned
        } else {
            TlsMode::Acme
        };

        if issue::issue(pool, &certificate.host, mode).await.is_ok() {
            changed = true;
        }
    }

    if changed {
        reconcile::run(pool).await?;
    }

    Ok(())
}
