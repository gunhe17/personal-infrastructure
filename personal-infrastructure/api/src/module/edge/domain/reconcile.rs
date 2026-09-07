use sqlx::PgPool;

use contract::domain_name::Status;
use contract::domain_name::TlsMode;

use crate::config;
use crate::infrastructure::docker;
use crate::infrastructure::edge::client as edge;
use crate::infrastructure::edge::render::TlsPaths;
use crate::infrastructure::edge::render::Vhost;
use crate::infrastructure::host::client as host;
use crate::module::certificate::domain::repository as certificate_repository;
use crate::module::common::exception::DomainError;
use crate::module::domain_name::domain::repository as domain_repository;
use crate::module::edge::domain::repository as rule_repository;
use crate::shared::exception::AppError;

// #
// reconcile

/// DB 의 도메인 전체를 읽어 vhost 파일을 전체 교체한다 — 부분 갱신을 하지 않는다.
/// 도메인이 붙거나 배포가 성공할 때마다 이 하나만 부른다.
pub async fn run(pool: &PgPool) -> Result<usize, AppError> {
    let attached = domain_repository::list_routable(pool).await?;
    let mut vhosts = Vec::new();

    for domain in &attached {
        let Some(port) = domain.upstream_port else {
            // 아직 뜬 배포가 없다 — 라우팅할 대상이 없으므로 건너뛴다
            domain_repository::update_status(pool, domain.id, Status::Pending).await?;

            continue;
        };

        let tls = match domain.tls_mode {
            TlsMode::None => None,
            _ => certificate_paths(pool, &domain.host).await?,
        };

        vhosts.push(Vhost {
            host: domain.host.clone(),
            upstream_host: config::Platform::current().upstream_host().to_owned(),
            upstream_port: port as u16,
            path_prefix: domain.path_prefix.clone(),
            tls,
            rules: rule_repository::rules_for(pool, domain.id).await?,
        });

        domain_repository::update_status(pool, domain.id, Status::Routed).await?;
    }

    // 파일을 먼저 쓰고 컨테이너를 띄운다 — 순서가 반대면 부팅 중 include 가 사라진다
    edge::apply(&vhosts).await?;

    if !vhosts.is_empty() {
        ensure_edge().await?;
        edge::reload().await?;
    }

    Ok(vhosts.len())
}

/// OpenResty 를 올리기 전에 누가 :80/:443 을 쥐고 있는지 먼저 본다.
/// 남이 잡고 있으면 띄우지 않는다 — 뺏으면 그쪽 서비스가 죽는다.
async fn ensure_edge() -> Result<(), AppError> {
    if docker::client::is_running(edge::CONTAINER).await {
        return Ok(());
    }

    let owners = host::edge_port_owner().await;

    if !owners.is_empty() {
        let names: Vec<String> = owners
            .iter()
            .map(|listener| format!("{}({})", listener.process, listener.port))
            .collect();

        return Err(DomainError::InvalidTransition {
            target: "Edge",
            actual: format!("이미 {} 가 잡고 있습니다", names.join(", ")),
        })?;
    }

    edge::ensure_running().await?;

    Ok(())
}

/// 인증서 PEM 을 엣지가 읽는 폴더에 떨궈 둔다 — 컨테이너는 파일만 본다.
async fn certificate_paths(pool: &PgPool, host: &str) -> Result<Option<TlsPaths>, AppError> {
    let Some(certificate) = certificate_repository::find_by_host(pool, host).await? else {
        return Ok(None);
    };

    let dir = edge::cert_dir();
    tokio::fs::create_dir_all(&dir).await?;

    let cert_path = dir.join(format!("{host}.crt"));
    let key_path = dir.join(format!("{host}.key"));

    tokio::fs::write(&cert_path, &certificate.cert_pem).await?;
    tokio::fs::write(&key_path, &certificate.key_pem).await?;

    Ok(Some(TlsPaths {
        certificate: format!("/etc/nginx/certs/{host}.crt"),
        key: format!("/etc/nginx/certs/{host}.key"),
    }))
}
