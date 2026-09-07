use chrono::DateTime;
use chrono::Utc;
use sqlx::PgConnection;
use sqlx::PgPool;
use uuid::Uuid;

use crate::shared::exception::AppError;

// #
// entity

#[derive(Debug, Clone)]
pub struct Certificate {
    pub id: Uuid,
    pub host: String,
    pub issuer: String,
    pub cert_pem: String,
    pub key_pem: String,
    pub not_after: DateTime<Utc>,
}

// #
// query

pub async fn find_by_host(pool: &PgPool, host: &str) -> Result<Option<Certificate>, AppError> {
    let found = sqlx::query_as!(
        Certificate,
        "select id, host, issuer, cert_pem, key_pem, not_after from certificate where host = $1",
        host
    )
    .fetch_optional(pool)
    .await?;

    Ok(found)
}

pub async fn list_all(
    connection: &mut PgConnection,
) -> Result<Vec<contract::domain_name::CertificateOutput>, AppError> {
    let listed = sqlx::query_as!(
        contract::domain_name::CertificateOutput,
        "select id, host, issuer, not_after from certificate order by host"
    )
    .fetch_all(connection)
    .await?;

    Ok(listed)
}

/// 갱신 대상 — 만료가 창 안으로 들어온 것만. 매번 전부 갱신하면 rate limit 에 걸린다.
pub async fn list_expiring(pool: &PgPool, within_days: i64) -> Result<Vec<Certificate>, AppError> {
    let listed = sqlx::query_as!(
        Certificate,
        r#"select id, host, issuer, cert_pem, key_pem, not_after from certificate
           where not_after < now() + make_interval(days => $1::int) and issuer <> 'manual'"#,
        within_days as i32
    )
    .fetch_all(pool)
    .await?;

    Ok(listed)
}

// #
// command

pub async fn upsert(
    pool: &PgPool,
    host: &str,
    issuer: &str,
    cert_pem: &str,
    key_pem: &str,
    not_after: DateTime<Utc>,
) -> Result<(), AppError> {
    sqlx::query!(
        r#"insert into certificate (id, host, issuer, cert_pem, key_pem, not_after)
           values ($1, $2, $3, $4, $5, $6)
           on conflict (host) do update
           set issuer = $3, cert_pem = $4, key_pem = $5, not_after = $6"#,
        Uuid::new_v4(),
        host,
        issuer,
        cert_pem,
        key_pem,
        not_after
    )
    .execute(pool)
    .await?;

    Ok(())
}
