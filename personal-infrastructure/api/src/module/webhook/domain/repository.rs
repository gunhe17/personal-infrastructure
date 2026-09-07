use chrono::DateTime;
use chrono::Utc;
use sqlx::PgConnection;
use sqlx::PgPool;
use uuid::Uuid;

use contract::webhook::Event;

use crate::module::common::exception::DomainError;
use crate::module::common::secret::Secret;
use crate::module::common::text;
use crate::shared::exception::AppError;

// #
// entity

#[derive(Debug, Clone)]
pub struct Hook {
    pub id: Uuid,
    pub event: Event,
    pub url: String,
    pub secret: Option<Secret>,
    pub created_at: DateTime<Utc>,
}

impl Hook {
    pub fn to_output(&self) -> contract::webhook::Output {
        contract::webhook::Output {
            id: self.id,
            event: self.event,
            url: self.url.clone(),
            signed: self.secret.is_some(),
            created_at: self.created_at,
        }
    }
}

struct Row {
    id: Uuid,
    event: String,
    url: String,
    secret: Option<String>,
    created_at: DateTime<Utc>,
}

impl TryFrom<Row> for Hook {
    type Error = DomainError;

    fn try_from(row: Row) -> Result<Self, Self::Error> {
        Ok(Self {
            id: row.id,
            event: text::parse("Event", &row.event)?,
            url: row.url,
            secret: row.secret.as_deref().map(Secret::open).transpose()?,
            created_at: row.created_at,
        })
    }
}

// #
// query

pub async fn list_all(connection: &mut PgConnection) -> Result<Vec<Hook>, AppError> {
    let rows = sqlx::query_as!(
        Row,
        "select id, event, url, secret, created_at from webhook order by created_at"
    )
    .fetch_all(connection)
    .await?;

    Ok(rows.into_iter().map(Hook::try_from).collect::<Result<Vec<_>, _>>()?)
}

/// 워커가 트랜잭션 밖에서 부른다.
pub async fn list_for(pool: &PgPool, event: Event) -> Result<Vec<Hook>, AppError> {
    let rows = sqlx::query_as!(
        Row,
        "select id, event, url, secret, created_at from webhook where event = $1",
        text::of(&event)
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(Hook::try_from).collect::<Result<Vec<_>, _>>()?)
}

pub async fn list_deliveries(
    connection: &mut PgConnection,
    hook_id: Uuid,
) -> Result<Vec<contract::webhook::Delivery>, AppError> {
    let listed = sqlx::query_as!(
        contract::webhook::Delivery,
        r#"select id, status, error, created_at from webhook_delivery
           where webhook_id = $1 order by id desc limit 50"#,
        hook_id
    )
    .fetch_all(connection)
    .await?;

    Ok(listed)
}

// #
// command

pub async fn add(connection: &mut PgConnection, hook: &Hook) -> Result<(), AppError> {
    sqlx::query!(
        "insert into webhook (id, event, url, secret, created_at) values ($1, $2, $3, $4, $5)",
        hook.id,
        text::of(&hook.event),
        hook.url,
        hook.secret.as_ref().map(Secret::seal),
        hook.created_at
    )
    .execute(connection)
    .await?;

    Ok(())
}

pub async fn remove(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    let affected = sqlx::query!("delete from webhook where id = $1", id)
        .execute(connection)
        .await?
        .rows_affected();

    if affected == 0 {
        return Err(DomainError::NotFound {
            target: "Webhook",
            identifier: id.to_string(),
        })?;
    }

    Ok(())
}

pub async fn record_delivery(
    pool: &PgPool,
    hook_id: Uuid,
    status: Option<u16>,
    error: Option<&str>,
) -> Result<(), AppError> {
    sqlx::query!(
        "insert into webhook_delivery (webhook_id, status, error) values ($1, $2, $3)",
        hook_id,
        status.map(i32::from),
        error
    )
    .execute(pool)
    .await?;

    Ok(())
}
