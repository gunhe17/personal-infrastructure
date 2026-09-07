use sqlx::PgConnection;
use sqlx::PgPool;
use uuid::Uuid;

use crate::shared::exception::AppError;

// #
// query

pub async fn list_open(
    connection: &mut PgConnection,
) -> Result<Vec<contract::system::Issue>, AppError> {
    let rows = sqlx::query!(
        r#"select id, scope, subject, severity, message from incident
           where closed_at is null order by opened_at desc"#
    )
    .fetch_all(connection)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| contract::system::Issue {
            id: row.id,
            scope: row.scope,
            subject: row.subject,
            severity: row.severity,
            message: row.message,
        })
        .collect())
}

pub async fn count_open(pool: &PgPool) -> Result<i64, AppError> {
    let row = sqlx::query!("select count(*) as count from incident where closed_at is null")
        .fetch_one(pool)
        .await?;

    Ok(row.count.unwrap_or(0))
}

// #
// command

/// 같은 (scope, subject) 로 열린 인시던트가 있으면 새로 열지 않는다 —
/// 부분 유니크 인덱스가 중복을 막고, 여기서는 메시지만 갱신한다.
pub async fn open(
    pool: &PgPool,
    scope: &str,
    subject: &str,
    severity: &str,
    message: &str,
) -> Result<(), AppError> {
    sqlx::query!(
        r#"insert into incident (id, scope, subject, severity, message)
           values ($1, $2, $3, $4, $5)
           on conflict (scope, subject) where closed_at is null
           do update set message = $5, severity = $4"#,
        Uuid::new_v4(),
        scope,
        subject,
        severity,
        message
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn close(pool: &PgPool, scope: &str, subject: &str) -> Result<(), AppError> {
    sqlx::query!(
        "update incident set closed_at = now() where scope = $1 and subject = $2 and closed_at is null",
        scope,
        subject
    )
    .execute(pool)
    .await?;

    Ok(())
}

/// 대상이 사라진 인시던트 — 예약이 풀린 포트, 지워진 컨테이너 — 는 영원히 열려 있으면 안 된다.
pub async fn close_except(pool: &PgPool, scope: &str, keep: &[String]) -> Result<(), AppError> {
    sqlx::query!(
        "update incident set closed_at = now() where scope = $1 and closed_at is null and subject <> all($2)",
        scope,
        keep
    )
    .execute(pool)
    .await?;

    Ok(())
}
