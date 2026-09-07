use sqlx::PgPool;
use uuid::Uuid;

use crate::shared::exception::AppError;

pub const CHANNEL: &str = "deployment_log";

// #
// query

pub async fn list_since(
    pool: &PgPool,
    deployment_id: Uuid,
    after: i64,
) -> Result<Vec<contract::deployment::LogLine>, AppError> {
    let rows = sqlx::query!(
        r#"select id, stream, line from deployment_log
           where deployment_id = $1 and id > $2 order by id limit 500"#,
        deployment_id,
        after
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| contract::deployment::LogLine {
            id: row.id,
            stream: row.stream,
            line: row.line,
        })
        .collect())
}

// #
// command

/// append 하고 NOTIFY 로 깨운다. payload 는 deployment_id 만 —
/// 본문을 실으면 8000바이트 상한과 순서 문제를 떠안는다.
pub async fn append(
    pool: &PgPool,
    deployment_id: Uuid,
    stream: &str,
    line: &str,
) -> Result<(), AppError> {
    sqlx::query!(
        "insert into deployment_log (deployment_id, stream, line) values ($1, $2, $3)",
        deployment_id,
        stream,
        line
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        "select pg_notify($1, $2)",
        CHANNEL,
        deployment_id.to_string()
    )
    .execute(pool)
    .await?;

    Ok(())
}
