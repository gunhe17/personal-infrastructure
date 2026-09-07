use chrono::DateTime;
use chrono::Utc;
use sqlx::PgConnection;
use sqlx::PgPool;

use crate::shared::exception::AppError;

// #
// command

pub async fn add(
    pool: &PgPool,
    bucket: DateTime<Utc>,
    host: &str,
    status: i32,
    path: &str,
    count: i32,
) -> Result<(), AppError> {
    sqlx::query!(
        r#"insert into request_stat (bucket, host, status, path, count) values ($1, $2, $3, $4, $5)
           on conflict (bucket, host, status, path) do update set count = request_stat.count + excluded.count"#,
        bucket,
        host,
        status,
        path,
        count
    )
    .execute(pool)
    .await?;

    Ok(())
}

// #
// query

/// 지난 24시간 — 전체 수, 상태코드 분포, 상위 경로 20.
pub async fn summary(connection: &mut PgConnection) -> Result<contract::analytics::Summary, AppError> {
    let since = Utc::now() - chrono::Duration::hours(24);

    let statuses = sqlx::query_as!(
        contract::analytics::StatusCount,
        r#"select status, sum(count)::bigint as "count!" from request_stat
           where bucket > $1 group by status order by status"#,
        since
    )
    .fetch_all(&mut *connection)
    .await?;

    let top_paths = sqlx::query_as!(
        contract::analytics::PathCount,
        r#"select host, path, sum(count)::bigint as "count!" from request_stat
           where bucket > $1 group by host, path order by 3 desc limit 20"#,
        since
    )
    .fetch_all(&mut *connection)
    .await?;

    Ok(contract::analytics::Summary {
        since,
        total: statuses.iter().map(|row| row.count).sum(),
        statuses,
        top_paths,
    })
}
