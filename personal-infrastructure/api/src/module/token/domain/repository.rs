use chrono::DateTime;
use chrono::Utc;
use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::common::exception::DomainError;
use crate::module::common::exception::unique_or;
use crate::module::common::text;
use crate::module::token::domain::Name;
use crate::module::token::domain::Token;
use crate::module::token::domain::secret;
use crate::shared::exception::AppError;

struct Row {
    id: Uuid,
    name: String,
    scopes: Vec<String>,
    source: String,
    created_at: DateTime<Utc>,
    revoked_at: Option<DateTime<Utc>>,
}

impl TryFrom<Row> for Token {
    type Error = DomainError;

    fn try_from(row: Row) -> Result<Self, Self::Error> {
        Ok(Self {
            id: row.id,
            name: Name::from_str(&row.name)?,
            // 모르는 스코프는 버린다 — 스코프가 줄어든 옛 토큰이 로그인 자체를 못 하면 안 된다
            scopes: row.scopes.iter().filter_map(|value| contract::text::parse(value)).collect(),
            source: row.source,
            created_at: row.created_at,
            revoked_at: row.revoked_at,
        })
    }
}

// #
// query

pub async fn list_all(connection: &mut PgConnection) -> Result<Vec<Token>, AppError> {
    let rows = sqlx::query_as!(
        Row,
        r#"select id, name, scopes, source, created_at, revoked_at
           from token order by created_at desc"#
    )
    .fetch_all(connection)
    .await?;

    Ok(rows
        .into_iter()
        .map(Token::try_from)
        .collect::<Result<Vec<_>, _>>()?)
}

pub async fn find_by_secret(
    connection: &mut PgConnection,
    plain: &str,
) -> Result<Option<Token>, AppError> {
    let row = sqlx::query_as!(
        Row,
        r#"select id, name, scopes, source, created_at, revoked_at
           from token where secret_hash = $1 and revoked_at is null"#,
        secret::hash_of(plain)
    )
    .fetch_optional(connection)
    .await?;

    Ok(row.map(Token::try_from).transpose()?)
}

// #
// command

pub async fn add(
    connection: &mut PgConnection,
    token: &Token,
    secret_hash: &str,
) -> Result<(), AppError> {
    let scopes: Vec<String> = token.scopes.iter().map(text::of).collect();

    sqlx::query!(
        r#"insert into token (id, name, secret_hash, scopes, source, created_at)
           values ($1, $2, $3, $4, $5, $6)"#,
        token.id,
        token.name.to_str(),
        secret_hash,
        &scopes,
        token.source,
        token.created_at,
    )
    .execute(connection)
    .await
    .map_err(|error| unique_or(error, "Token", token.name.to_str()))?;

    Ok(())
}

pub async fn revoke(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    let affected = sqlx::query!(
        "update token set revoked_at = now() where id = $1 and revoked_at is null",
        id
    )
    .execute(connection)
    .await?
    .rows_affected();

    if affected == 0 {
        return Err(DomainError::NotFound {
            target: "Token",
            identifier: id.to_string(),
        })?;
    }

    Ok(())
}

pub async fn touch(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    sqlx::query!("update token set last_used_at = now() where id = $1", id)
        .execute(connection)
        .await?;

    Ok(())
}
