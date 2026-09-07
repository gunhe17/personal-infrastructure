use sqlx::PgConnection;
use uuid::Uuid;

use crate::shared::exception::AppError;

// #
// query

pub async fn list_recent(
    connection: &mut PgConnection,
    limit: i64,
) -> Result<Vec<contract::system::AuditEntry>, AppError> {
    let rows = sqlx::query!(
        r#"select id, token_id, source, action, created_at
           from audit_entry order by id desc limit $1"#,
        limit
    )
    .fetch_all(connection)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| contract::system::AuditEntry {
            id: row.id,
            token_id: row.token_id,
            source: row.source,
            action: row.action,
            created_at: row.created_at,
        })
        .collect())
}

// #
// command

/// 봉투가 부른다 — endpoint 가 잊을 수 없는 자리에 둔다.
pub async fn record(
    connection: &mut PgConnection,
    token_id: Option<Uuid>,
    source: &str,
    action: &str,
) -> Result<(), AppError> {
    sqlx::query!(
        "insert into audit_entry (token_id, source, action) values ($1, $2, $3)",
        token_id,
        source,
        action
    )
    .execute(connection)
    .await?;

    Ok(())
}
