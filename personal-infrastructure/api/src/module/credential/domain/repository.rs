use chrono::DateTime;
use chrono::Utc;
use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::common::exception::DomainError;
use crate::module::common::exception::unique_or;
use crate::module::common::secret::Secret;
use crate::shared::exception::AppError;

// #
// query

pub async fn list_all(
    connection: &mut PgConnection,
) -> Result<Vec<contract::credential::Output>, AppError> {
    let rows =
        sqlx::query!("select id, name, kind, secret, created_at from credential order by name")
            .fetch_all(connection)
            .await?;

    rows.into_iter()
        .map(|row| {
            Ok(contract::credential::Output {
                id: row.id,
                name: row.name,
                kind: row.kind,
                preview: Secret::open(&row.secret)?.preview(),
                created_at: row.created_at,
            })
        })
        .collect()
}

pub async fn get_secret(connection: &mut PgConnection, id: Uuid) -> Result<Secret, AppError> {
    let row = sqlx::query!("select secret from credential where id = $1", id)
        .fetch_optional(connection)
        .await?;

    let found = row.ok_or(DomainError::NotFound {
        target: "Credential",
        identifier: id.to_string(),
    })?;

    Ok(Secret::open(&found.secret)?)
}

pub async fn find_by_name(connection: &mut PgConnection, name: &str) -> Result<Option<Secret>, AppError> {
    let row = sqlx::query!("select secret from credential where name = $1", name)
        .fetch_optional(connection)
        .await?;

    Ok(row.map(|row| Secret::open(&row.secret)).transpose()?)
}

pub async fn upsert(
    connection: &mut PgConnection,
    name: &str,
    kind: &str,
    secret: &Secret,
) -> Result<(), AppError> {
    sqlx::query!(
        r#"insert into credential (id, name, kind, secret) values ($1, $2, $3, $4)
           on conflict (name) do update set kind = $3, secret = $4"#,
        Uuid::new_v4(),
        name,
        kind,
        secret.seal()
    )
    .execute(connection)
    .await?;

    Ok(())
}

// #
// command

/// 봉인해서 넣고 DB 가 찍은 시각을 돌려준다.
pub async fn add(
    connection: &mut PgConnection,
    id: Uuid,
    name: &str,
    kind: &str,
    secret: &Secret,
) -> Result<DateTime<Utc>, AppError> {
    let row = sqlx::query!(
        "insert into credential (id, name, kind, secret) values ($1, $2, $3, $4) returning created_at",
        id,
        name,
        kind,
        secret.seal()
    )
    .fetch_one(connection)
    .await
    .map_err(|error| unique_or(error, "Credential", name))?;

    Ok(row.created_at)
}

pub async fn remove(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    let affected = sqlx::query!("delete from credential where id = $1", id)
        .execute(connection)
        .await?
        .rows_affected();

    if affected == 0 {
        return Err(DomainError::NotFound {
            target: "Credential",
            identifier: id.to_string(),
        })?;
    }

    Ok(())
}
