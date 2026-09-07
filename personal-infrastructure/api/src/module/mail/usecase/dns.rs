use sqlx::PgConnection;

use crate::module::common::exception::DomainError;
use crate::module::mail::SETTING_DOMAIN;
use crate::module::setting::domain::repository as setting_repository;
use crate::shared::exception::AppError;

pub use contract::mail::DnsRecord as Output;

// #
// usecase

/// 등록해야 할 레코드. DKIM 은 Stalwart 가 키를 만들므로 관리 UI 에서 값을 가져온다.
pub async fn dns(connection: &mut PgConnection) -> Result<Vec<Output>, AppError> {
    let domain = setting_repository::get(connection, SETTING_DOMAIN)
        .await?
        .and_then(|value| value.as_str().map(str::to_owned))
        .ok_or(DomainError::InvalidTransition {
            target: "Mail",
            actual: "아직 setup 하지 않았습니다".to_owned(),
        })?;

    let record = |name: String, kind: &str, value: String, note: &str| Output {
        name,
        kind: kind.to_owned(),
        value,
        note: note.to_owned(),
    };

    Ok(vec![
        record(format!("mail.{domain}"), "A", "<공인 IP>".into(), "이 서버의 공인 주소. rDNS(PTR) 도 같은 이름으로 — 없으면 대형 메일서비스가 거부한다"),
        record(domain.clone(), "MX", format!("10 mail.{domain}"), ""),
        record(domain.clone(), "TXT", "v=spf1 mx -all".into(), "SPF"),
        record(format!("_dmarc.{domain}"), "TXT", format!("v=DMARC1; p=quarantine; rua=mailto:postmaster@{domain}"), "DMARC"),
        record(format!("<selector>._domainkey.{domain}"), "TXT", "<관리 UI → Domains → DKIM 에서 복사>".into(), "DKIM — Stalwart 가 키를 만든다"),
    ])
}
