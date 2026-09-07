use chrono::DateTime;
use chrono::Utc;
use sqlx::PgConnection;
use sqlx::PgExecutor;
use sqlx::PgPool;
use uuid::Uuid;

use contract::database::Engine;
use contract::database::Status;

use crate::module::common::exception::DomainError;
use crate::module::common::exception::unique_or;
use crate::module::common::secret::Secret;
use crate::module::common::text;
use crate::shared::exception::AppError;

// #
// entity

#[derive(Debug, Clone)]
pub struct Instance {
    pub id: Uuid,
    pub name: String,
    pub engine: Engine,
    pub version: String,
    pub host_port: i32,
    pub username: String,
    pub password: Secret,
    pub database: String,
    pub volume: String,
    pub status: Status,
    pub created_at: DateTime<Utc>,
}

impl Instance {
    pub fn container(&self) -> String {
        format!("pi-db-{}", self.name)
    }

    pub fn to_output(&self) -> contract::database::Output {
        contract::database::Output {
            id: self.id,
            name: self.name.clone(),
            engine: self.engine,
            version: self.version.clone(),
            host_port: self.host_port as u16,
            status: self.status,
            created_at: self.created_at,
        }
    }
}

struct Row {
    id: Uuid,
    name: String,
    engine: String,
    version: String,
    host_port: i32,
    username: String,
    password: String,
    database: String,
    volume: String,
    status: String,
    created_at: DateTime<Utc>,
}

impl TryFrom<Row> for Instance {
    type Error = DomainError;

    fn try_from(row: Row) -> Result<Self, Self::Error> {
        Ok(Self {
            id: row.id,
            name: row.name,
            engine: text::parse("Engine", &row.engine)?,
            version: row.version,
            host_port: row.host_port,
            username: row.username,
            password: Secret::open(&row.password)?,
            database: row.database,
            volume: row.volume,
            status: text::parse("Status", &row.status)?,
            created_at: row.created_at,
        })
    }
}

// #
// query

pub async fn list_all(connection: &mut PgConnection) -> Result<Vec<Instance>, AppError> {
    let rows = sqlx::query_as!(
        Row,
        r#"select id, name, engine, version, host_port, username, password, database, volume,
                  status, created_at
           from managed_database order by name"#
    )
    .fetch_all(connection)
    .await?;

    Ok(rows
        .into_iter()
        .map(Instance::try_from)
        .collect::<Result<Vec<_>, _>>()?)
}

pub async fn get_by_id(connection: &mut PgConnection, id: Uuid) -> Result<Instance, AppError> {
    let row = sqlx::query_as!(
        Row,
        r#"select id, name, engine, version, host_port, username, password, database, volume,
                  status, created_at
           from managed_database where id = $1"#,
        id
    )
    .fetch_optional(connection)
    .await?;

    let found = row.ok_or(DomainError::NotFound {
        target: "Database",
        identifier: id.to_string(),
    })?;

    Ok(Instance::try_from(found)?)
}

pub async fn get_by_pool(pool: &PgPool, id: Uuid) -> Result<Instance, AppError> {
    let mut connection = pool.acquire().await?;

    get_by_id(&mut connection, id).await
}

// #
// command

pub async fn add(connection: &mut PgConnection, instance: &Instance) -> Result<(), AppError> {
    sqlx::query!(
        r#"insert into managed_database
           (id, name, engine, version, host_port, username, password, database, volume, status, created_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)"#,
        instance.id,
        instance.name,
        text::of(&instance.engine),
        instance.version,
        instance.host_port,
        instance.username,
        instance.password.seal(),
        instance.database,
        instance.volume,
        text::of(&instance.status),
        instance.created_at,
    )
    .execute(connection)
    .await
    .map_err(|error| unique_or(error, "Database", &instance.name))?;

    Ok(())
}

pub async fn update_status(
    executor: impl PgExecutor<'_>,
    id: Uuid,
    status: Status,
) -> Result<(), AppError> {
    sqlx::query!(
        "update managed_database set status = $2 where id = $1",
        id,
        text::of(&status)
    )
    .execute(executor)
    .await?;

    Ok(())
}

pub async fn remove(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    sqlx::query!("delete from managed_database where id = $1", id)
        .execute(connection)
        .await?;

    Ok(())
}
