use sqlx::PgPool;

use contract::domain_name::TlsMode;

use crate::infrastructure::acme::client as acme;
use crate::module::certificate::domain::repository;
use crate::module::common::exception::DomainError;
use crate::module::credential::domain::repository as credential_repository;
use crate::module::setting::domain::repository as setting_repository;
use crate::shared::exception::AppError;

/// DNS-01 에 쓰는 Cloudflare 토큰 — `pi credential create cloudflare-dns dns <token>`
pub const DNS_CREDENTIAL: &str = "cloudflare-dns";

// #
// issue

/// 발급해서 저장한다. 와일드카드는 DNS-01, 나머지는 HTTP-01, self_signed 는 openssl.
/// 워커(갱신)와 `domain ssl`(지금 발급)이 같은 길을 탄다.
pub async fn issue(pool: &PgPool, host: &str, mode: TlsMode) -> Result<(), AppError> {
    let issued = match mode {
        TlsMode::SelfSigned => acme::self_signed(host).await?,
        TlsMode::None | TlsMode::Manual => {
            return Err(DomainError::InvalidTransition {
                target: "Certificate",
                actual: format!("{} 모드는 발급 대상이 아닙니다", contract::text::of(&mode)),
            })?;
        }
        TlsMode::Acme => {
            let mut connection = pool.acquire().await?;
            let email = setting_repository::get(&mut connection, "acme_email")
                .await?
                .and_then(|value| value.as_str().map(str::to_owned))
                .unwrap_or_else(|| "admin@localhost".to_owned());

            if host.starts_with("*.") {
                let token = credential_repository::find_by_name(&mut connection, DNS_CREDENTIAL)
                    .await?
                    .ok_or(DomainError::InvalidTransition {
                        target: "Certificate",
                        actual: format!("와일드카드는 DNS-01 — credential `{DNS_CREDENTIAL}` 이 필요합니다"),
                    })?;

                acme::issue_dns01(host, &email, token.to_str()).await?
            } else {
                acme::issue_http01(host, &email).await?
            }
        }
    };

    repository::upsert(pool, host, &issued.issuer, &issued.certificate, &issued.key, issued.not_after).await
}
