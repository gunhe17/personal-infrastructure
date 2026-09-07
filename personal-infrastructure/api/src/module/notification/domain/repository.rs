use sqlx::PgConnection;
use sqlx::PgPool;
use uuid::Uuid;

use contract::notification::ChannelKind;

use crate::module::common::exception::unique_or;
use crate::module::common::text;
use crate::shared::exception::AppError;

// #
// query

pub async fn list_all(
    connection: &mut PgConnection,
) -> Result<Vec<contract::notification::ChannelOutput>, AppError> {
    let rows =
        sqlx::query!("select id, name, kind, target from notification_channel order by name")
            .fetch_all(connection)
            .await?;

    rows.into_iter()
        .map(|row| {
            Ok(contract::notification::ChannelOutput {
                id: row.id,
                name: row.name,
                kind: text::parse("ChannelKind", &row.kind)?,
                target: row.target,
            })
        })
        .collect()
}

/// 워커가 트랜잭션 밖에서 부른다 — 알림 실패가 본 작업을 되돌리면 안 된다.
pub async fn list_targets(pool: &PgPool) -> Result<Vec<(ChannelKind, String)>, AppError> {
    let rows = sqlx::query!("select kind, target from notification_channel")
        .fetch_all(pool)
        .await?;

    rows.into_iter()
        .map(|row| Ok((text::parse("ChannelKind", &row.kind)?, row.target)))
        .collect()
}

// #
// command

pub async fn add(
    connection: &mut PgConnection,
    channel: &contract::notification::ChannelOutput,
) -> Result<(), AppError> {
    sqlx::query!(
        "insert into notification_channel (id, name, kind, target) values ($1, $2, $3, $4)",
        channel.id,
        channel.name,
        text::of(&channel.kind),
        channel.target
    )
    .execute(connection)
    .await
    .map_err(|error| unique_or(error, "NotificationChannel", &channel.name))?;

    Ok(())
}

pub async fn remove(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    sqlx::query!("delete from notification_channel where id = $1", id)
        .execute(connection)
        .await?;

    Ok(())
}
