use crate::infrastructure::database;
use crate::module::certificate::domain::repository;
use crate::module::common::exception::DomainError;
use crate::module::domain_name::domain::Host;
use crate::shared::exception::AppError;

pub use contract::domain_name::UploadCertInput as Input;

// #
// usecase

/// 사내 CA·유료 인증서를 손으로 올린다. issuer 가 manual 이면 갱신 워커가 건드리지 않는다.
pub async fn upload(input: Input) -> Result<(), AppError> {
    // validate
    let host = Host::from_str(&input.host)?;

    if !input.cert_pem.contains("BEGIN CERTIFICATE") {
        return Err(DomainError::InvalidFormat {
            target: "Certificate",
        })?;
    }

    if !input.key_pem.contains("PRIVATE KEY") {
        return Err(DomainError::InvalidFormat {
            target: "PrivateKey",
        })?;
    }

    // persist — 만료는 갱신 워커가 다시 읽어 채운다. 여기서는 멀리 잡아 둔다
    let not_after = chrono::Utc::now() + chrono::Duration::days(365);

    repository::upsert(
        database::pool(),
        host.to_str(),
        "manual",
        &input.cert_pem,
        &input.key_pem,
        not_after,
    )
    .await
}
