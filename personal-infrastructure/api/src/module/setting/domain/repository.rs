use serde_json::Value;
use sqlx::PgConnection;

use crate::shared::exception::AppError;

// #
// query

pub async fn list_all(
    connection: &mut PgConnection,
) -> Result<Vec<contract::system::Setting>, AppError> {
    let rows = sqlx::query!("select key, value from setting order by key")
        .fetch_all(connection)
        .await?;

    Ok(rows
        .into_iter()
        .map(|row| contract::system::Setting {
            key: row.key,
            value: row.value,
        })
        .collect())
}

pub async fn get(connection: &mut PgConnection, key: &str) -> Result<Option<Value>, AppError> {
    let row = sqlx::query!("select value from setting where key = $1", key)
        .fetch_optional(connection)
        .await?;

    Ok(row.map(|row| row.value))
}

// #
// command

pub async fn set(connection: &mut PgConnection, key: &str, value: &Value) -> Result<(), AppError> {
    sqlx::query!(
        r#"insert into setting (key, value) values ($1, $2)
           on conflict (key) do update set value = $2, updated_at = now()"#,
        key,
        value
    )
    .execute(connection)
    .await?;

    Ok(())
}
