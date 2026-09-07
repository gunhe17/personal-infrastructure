use chrono::DateTime;
use chrono::Utc;
use sqlx::PgConnection;
use sqlx::PgPool;
use uuid::Uuid;

use contract::domain_name::Status;
use contract::domain_name::TlsMode;

use crate::module::common::exception::DomainError;
use crate::module::common::exception::unique_or;
use crate::module::common::text;
use crate::shared::exception::AppError;

// #
// entity

#[derive(Debug, Clone)]
pub struct Attached {
    pub id: Uuid,
    pub project_id: Uuid,
    pub host: String,
    pub path_prefix: String,
    pub tls_mode: TlsMode,
    pub status: Status,
    pub upstream_port: Option<i32>,
    pub created_at: DateTime<Utc>,
}

impl Attached {
    pub fn to_output(&self) -> contract::domain_name::Output {
        contract::domain_name::Output {
            id: self.id,
            project_id: self.project_id,
            host: self.host.clone(),
            path_prefix: self.path_prefix.clone(),
            tls_mode: self.tls_mode,
            status: self.status,
            certificate_not_after: None,
            created_at: self.created_at,
        }
    }
}

struct Row {
    id: Uuid,
    project_id: Uuid,
    host: String,
    path_prefix: String,
    tls_mode: String,
    status: String,
    upstream_port: Option<i32>,
    created_at: DateTime<Utc>,
}

impl TryFrom<Row> for Attached {
    type Error = DomainError;

    fn try_from(row: Row) -> Result<Self, Self::Error> {
        Ok(Self {
            id: row.id,
            project_id: row.project_id,
            host: row.host,
            path_prefix: row.path_prefix,
            tls_mode: text::parse("TlsMode", &row.tls_mode)?,
            status: text::parse("Status", &row.status)?,
            upstream_port: row.upstream_port,
            created_at: row.created_at,
        })
    }
}

// #
// query

/// 엣지 재생성이 이걸 쓴다 — 도메인마다 그 프로젝트의 현재 포트를 함께 읽는다.
pub async fn list_routable(pool: &PgPool) -> Result<Vec<Attached>, AppError> {
    let rows = sqlx::query_as!(
        Row,
        r#"select d.id, d.project_id, d.host, d.path_prefix, d.tls_mode, d.status, d.created_at,
                  (select host_port from deployment
                    where project_id = d.project_id and status = 'running'
                    order by created_at desc limit 1) as upstream_port
           from domain_name d order by d.host"#
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(Attached::try_from)
        .collect::<Result<Vec<_>, _>>()?)
}

pub async fn list_all(connection: &mut PgConnection) -> Result<Vec<Attached>, AppError> {
    let rows = sqlx::query_as!(
        Row,
        r#"select id, project_id, host, path_prefix, tls_mode, status, created_at,
                  null::integer as upstream_port
           from domain_name order by host"#
    )
    .fetch_all(connection)
    .await?;

    Ok(rows
        .into_iter()
        .map(Attached::try_from)
        .collect::<Result<Vec<_>, _>>()?)
}

pub async fn get_by_id(connection: &mut PgConnection, id: Uuid) -> Result<Attached, AppError> {
    let row = sqlx::query_as!(
        Row,
        r#"select id, project_id, host, path_prefix, tls_mode, status, created_at,
                  null::integer as upstream_port
           from domain_name where id = $1"#,
        id
    )
    .fetch_optional(connection)
    .await?;

    let found = row.ok_or(DomainError::NotFound {
        target: "Domain",
        identifier: id.to_string(),
    })?;

    Ok(Attached::try_from(found)?)
}

pub async fn list_hosts_by_project(
    connection: &mut PgConnection,
    project_id: Uuid,
) -> Result<Vec<String>, AppError> {
    let rows = sqlx::query!(
        "select host from domain_name where project_id = $1 order by host",
        project_id
    )
    .fetch_all(connection)
    .await?;

    Ok(rows.into_iter().map(|row| row.host).collect())
}

// #
// command

pub async fn add(connection: &mut PgConnection, attached: &Attached) -> Result<(), AppError> {
    sqlx::query!(
        r#"insert into domain_name (id, project_id, host, path_prefix, tls_mode, status, created_at)
           values ($1, $2, $3, $4, $5, $6, $7)"#,
        attached.id,
        attached.project_id,
        attached.host,
        attached.path_prefix,
        text::of(&attached.tls_mode),
        text::of(&attached.status),
        attached.created_at,
    )
    .execute(connection)
    .await
    .map_err(|error| unique_or(error, "Domain", &attached.host))?;

    Ok(())
}

pub async fn update_status(pool: &PgPool, id: Uuid, status: Status) -> Result<(), AppError> {
    sqlx::query!(
        "update domain_name set status = $2 where id = $1",
        id,
        text::of(&status)
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn remove(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    let affected = sqlx::query!("delete from domain_name where id = $1", id)
        .execute(connection)
        .await?
        .rows_affected();

    if affected == 0 {
        return Err(DomainError::NotFound {
            target: "Domain",
            identifier: id.to_string(),
        })?;
    }

    Ok(())
}
