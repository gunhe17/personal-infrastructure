use sqlx::PgConnection;

use crate::infrastructure::docker;
use crate::infrastructure::docker::client::Run;
use crate::infrastructure::process;
use crate::module::domain_name::domain::Host;
use crate::module::mail::CONTAINER;
use crate::module::mail::IMAGE;
use crate::module::mail::PORTS;
use crate::module::mail::SETTING_DOMAIN;
use crate::module::mail::VOLUME;
use crate::module::mail::usecase::status;
use crate::module::project::domain::repository as project_repository;
use crate::module::setting::domain::repository as setting_repository;
use crate::shared::exception::AppError;

pub use contract::mail::SetupInput as Input;
pub use contract::mail::Status as Output;

// #
// usecase

/// Stalwart 하나로 SMTP·IMAP·관리 UI 를 다 받는다. 25·465·587·993 은 0.0.0.0 — 메일은 엣지를 못 탄다.
// ponytail: 첫 pull 이 요청을 붙잡는다 — 한 번 하는 일이라 job 으로 빼지 않았다
pub async fn setup(connection: &mut PgConnection, input: Input) -> Result<Output, AppError> {
    let domain = Host::from_str(&input.domain)?;
    setting_repository::set(connection, SETTING_DOMAIN, &serde_json::json!(domain.to_str())).await?;

    // admin UI 는 루프백 예약 포트로
    let admin = project_repository::claim_port(connection, None, "mail:admin").await?;

    docker::client::create_volume(VOLUME).await?;
    docker::client::remove(CONTAINER).await;
    docker::client::run(Run {
        name: CONTAINER.to_owned(),
        image: IMAGE.to_owned(),
        publish: Some((admin.to_u16(), 8080)),
        publish_public: PORTS.iter().map(|port| (*port, *port)).collect(),
        mounts: vec![(VOLUME.to_owned(), "/opt/stalwart-mail".to_owned())],
        ..Default::default()
    })
    .await?;

    // 방화벽 — 동의했을 때만, 다룰 줄 아는 매니저만. 아니면 명령을 돌려준다
    let firewall_hint = if input.open_firewall {
        open_firewall().await
    } else {
        Some(firewall_commands())
    };

    let mut current = status::status(connection).await?;
    current.firewall_hint = firewall_hint;

    Ok(current)
}

async fn open_firewall() -> Option<String> {
    let ports = PORTS.iter().map(u16::to_string).collect::<Vec<_>>().join(",");

    if process::output("sh", ["-c", "command -v ufw"]).await.is_ok() {
        return process::output("ufw", ["allow", &format!("{ports}/tcp")])
            .await
            .err()
            .map(|error| format!("ufw 실패 ({error}) — 직접: {}", firewall_commands()));
    }

    if process::output("sh", ["-c", "command -v firewall-cmd"]).await.is_ok() {
        for port in PORTS {
            if let Err(error) = process::output("firewall-cmd", ["--permanent", &format!("--add-port={port}/tcp")]).await {
                return Some(format!("firewall-cmd 실패 ({error}) — 직접: {}", firewall_commands()));
            }
        }
        let _ = process::output("firewall-cmd", ["--reload"]).await;

        return None;
    }

    Some(format!("ufw/firewalld 가 없어 열지 않았습니다 — 직접: {}", firewall_commands()))
}

fn firewall_commands() -> String {
    let ports = PORTS.iter().map(u16::to_string).collect::<Vec<_>>().join(",");

    format!("ufw allow {ports}/tcp  (또는 firewall-cmd --permanent --add-port=25/tcp … --reload). NAT 공유기에서도 같은 포트를 이 서버로")
}
