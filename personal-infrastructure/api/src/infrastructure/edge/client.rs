use std::path::PathBuf;

use crate::config;
use crate::infrastructure::docker;
use crate::infrastructure::docker::client::Run;
use crate::infrastructure::edge::exception::EdgeError;
use crate::infrastructure::edge::render;
use crate::infrastructure::edge::render::Vhost;

pub const CONTAINER: &str = "pi-edge";
const IMAGE: &str = "openresty/openresty:alpine";

// #
// path

pub fn config_dir() -> PathBuf {
    config::get().work_dir.join("edge/conf.d")
}

pub fn cert_dir() -> PathBuf {
    config::get().work_dir.join("edge/certs")
}

pub fn acme_dir() -> PathBuf {
    config::get().work_dir.join("edge/acme")
}

fn root_conf() -> PathBuf {
    config::get().work_dir.join("edge/nginx.conf")
}

// #
// apply

/// 전체 교체 — 우리가 쓴 파일만 지우고 다시 쓴다. 마커 없는 파일은 남의 것이라 건드리지 않는다 [INV-10].
/// conf.d 는 DB 의 파생물이라 따로 백업하지 않는다 [INV-9].
pub async fn apply(vhosts: &[Vhost]) -> Result<(), EdgeError> {
    let dir = config_dir();
    tokio::fs::create_dir_all(&dir).await?;

    let mut entries = tokio::fs::read_dir(&dir).await?;

    while let Ok(Some(entry)) = entries.next_entry().await {
        let path = entry.path();

        if path.extension().is_none_or(|ext| ext != "conf") {
            continue;
        }

        // 소유 표시가 없으면 사람이 손으로 넣은 것 — 지우지 않는다
        let owned = tokio::fs::read_to_string(&path)
            .await
            .map(|body| body.starts_with(render::MARKER))
            .unwrap_or(false);

        if owned {
            tokio::fs::remove_file(&path).await.ok();
        }
    }

    for vhost in vhosts {
        tokio::fs::write(dir.join(format!("{}.conf", vhost.host)), render::render(vhost)).await?;
    }

    reload().await
}

// #
// lifecycle

/// 엣지가 유일한 공개 창구 — :80/:443 을 이 컨테이너만 잡는다.
pub async fn ensure_running() -> Result<(), EdgeError> {
    if docker::client::is_running(CONTAINER).await {
        return Ok(());
    }

    for dir in [config_dir(), cert_dir(), acme_dir()] {
        tokio::fs::create_dir_all(&dir).await?;
    }

    tokio::fs::write(root_conf(), ROOT_CONF).await?;
    docker::client::remove(CONTAINER).await;

    let mount = |source: PathBuf, target: &str| (source.display().to_string(), target.to_owned());

    // 리눅스: 호스트 네트워크로 :80/:443 직접. Mac: publish — Docker Desktop 이 호스트 포트를 대신 잡는다
    let mac = config::Platform::current() == config::Platform::Mac;

    docker::client::run(Run {
        name: CONTAINER.to_owned(),
        image: IMAGE.to_owned(),
        network_host: !mac,
        publish_public: if mac { vec![(80, 80), (443, 443)] } else { Vec::new() },
        mounts: vec![
            mount(root_conf(), "/usr/local/openresty/nginx/conf/nginx.conf"),
            mount(config_dir(), "/etc/nginx/conf.d"),
            mount(cert_dir(), "/etc/nginx/certs"),
            mount(acme_dir(), "/var/www/acme"),
        ],
        ..Default::default()
    })
    .await?;

    Ok(())
}

pub async fn reload() -> Result<(), EdgeError> {
    if !docker::client::is_running(CONTAINER).await {
        return Ok(());
    }

    docker::client::exec(CONTAINER, &["openresty", "-s", "reload"]).await?;

    Ok(())
}

const ROOT_CONF: &str = r#"worker_processes auto;
events { worker_connections 1024; }
http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    server_tokens off;

    # 집계용 — 호스트·상태·메서드·경로만. 워커가 docker logs 로 읽는다
    log_format pi '$host $status $request_method $uri';
    access_log /dev/stdout pi;

    limit_req_zone $binary_remote_addr zone=pi:10m rate=10r/s;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    include /etc/nginx/conf.d/*.conf;
}
"#;
