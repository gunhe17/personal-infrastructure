use chrono::DateTime;
use chrono::Utc;
use sqlx::PgConnection;
use sqlx::PgExecutor;
use uuid::Uuid;

use crate::infrastructure::host::client as host;
use crate::module::common::exception::DomainError;
use crate::module::common::exception::unique_or;
use crate::module::common::secret::Secret;
use crate::module::common::text;
use crate::module::project::domain::Env;
use crate::module::project::domain::Key;
use crate::module::project::domain::Name;
use crate::module::project::domain::Port;
use crate::module::project::domain::Project;
use crate::module::project::domain::Source;
use crate::module::project::domain::Status;
use crate::shared::exception::AppError;

struct Row {
    id: Uuid,
    name: String,
    group_name: String,
    environment: String,
    source_kind: String,
    source_ref: String,
    stack: Option<String>,
    port: Option<i32>,
    status: String,
    cpus: Option<f32>,
    memory_mb: Option<i32>,
    env_updated_at: Option<DateTime<Utc>>,
    commit: Option<String>,
    created_at: DateTime<Utc>,
}

impl TryFrom<Row> for Project {
    type Error = DomainError;

    fn try_from(row: Row) -> Result<Self, Self::Error> {
        Ok(Self {
            id: row.id,
            name: Name::from_str(&row.name)?,
            group: Name::from_str(&row.group_name)?,
            environment: Name::from_str(&row.environment)?,
            source: Source::from_parts(text::parse("SourceKind", &row.source_kind)?, &row.source_ref)?,
            stack: row.stack,
            port: row.port.map(Port::from_i32).transpose()?,
            status: text::parse("Status", &row.status)?,
            cpus: row.cpus,
            memory_mb: row.memory_mb,
            env_updated_at: row.env_updated_at,
            commit: row.commit,
            created_at: row.created_at,
        })
    }
}

// #
// query

pub async fn list_all(connection: &mut PgConnection) -> Result<Vec<Project>, AppError> {
    let rows = sqlx::query_as!(
        Row,
        r#"select p.id, p.name, p.group_name, p.environment, p.source_kind, p.source_ref, p.stack,
                  p.port, p.status, p.cpus, p.memory_mb, p.env_updated_at, p.created_at,
                  (select commit from deployment
                    where project_id = p.id and status = 'running'
                    order by created_at desc limit 1) as commit
           from project p where p.deleted_at is null order by p.group_name, p.environment"#
    )
    .fetch_all(connection)
    .await?;

    Ok(rows
        .into_iter()
        .map(Project::try_from)
        .collect::<Result<Vec<_>, _>>()?)
}

pub async fn find_by_id(
    executor: impl PgExecutor<'_>,
    id: Uuid,
) -> Result<Option<Project>, AppError> {
    let row = sqlx::query_as!(
        Row,
        r#"select p.id, p.name, p.group_name, p.environment, p.source_kind, p.source_ref, p.stack,
                  p.port, p.status, p.cpus, p.memory_mb, p.env_updated_at, p.created_at,
                  (select commit from deployment
                    where project_id = p.id and status = 'running'
                    order by created_at desc limit 1) as commit
           from project p where p.id = $1 and p.deleted_at is null"#,
        id
    )
    .fetch_optional(executor)
    .await?;

    Ok(row.map(Project::try_from).transpose()?)
}

pub async fn get_by_id(executor: impl PgExecutor<'_>, id: Uuid) -> Result<Project, AppError> {
    let found = find_by_id(executor, id).await?;

    Ok(found.ok_or(DomainError::NotFound {
        target: "Project",
        identifier: id.to_string(),
    })?)
}

// #
// command

pub async fn add(connection: &mut PgConnection, project: &Project) -> Result<(), AppError> {
    sqlx::query!(
        r#"insert into project
           (id, name, group_name, environment, source_kind, source_ref, stack, port, status, created_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"#,
        project.id,
        project.name.to_str(),
        project.group.to_str(),
        project.environment.to_str(),
        text::of(&project.source.kind()),
        project.source.to_str(),
        project.stack,
        project.port.map(Port::to_i32),
        text::of(&project.status),
        project.created_at,
    )
    .execute(connection)
    .await
    .map_err(|error| {
        unique_or(
            error,
            "Project",
            &format!("{}/{}", project.group.to_str(), project.environment.to_str()),
        )
    })?;

    Ok(())
}

pub async fn update_status(
    executor: impl PgExecutor<'_>,
    id: Uuid,
    status: Status,
) -> Result<(), AppError> {
    sqlx::query!(
        "update project set status = $2, updated_at = now() where id = $1",
        id,
        text::of(&status)
    )
    .execute(executor)
    .await?;

    Ok(())
}

/// 감지 결과를 프로젝트에도 박는다 — `is_compose()` 와 `container()` 가 이걸 본다.
/// 사용자가 포트를 지정했으면(`port` 가 이미 있음) 감지 포트로 덮지 않는다.
pub async fn update_detected(
    executor: impl PgExecutor<'_>,
    id: Uuid,
    stack: &str,
    port: Option<Port>,
) -> Result<(), AppError> {
    sqlx::query!(
        "update project set stack = $2, port = coalesce(port, $3), updated_at = now() where id = $1",
        id,
        stack,
        port.map(Port::to_i32)
    )
    .execute(executor)
    .await?;

    Ok(())
}

pub async fn update_limits(
    connection: &mut PgConnection,
    id: Uuid,
    cpus: Option<f32>,
    memory_mb: Option<i32>,
) -> Result<(), AppError> {
    sqlx::query!(
        "update project set cpus = $2, memory_mb = $3, updated_at = now() where id = $1",
        id,
        cpus,
        memory_mb
    )
    .execute(connection)
    .await?;

    Ok(())
}

pub async fn remove(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    let affected = sqlx::query!(
        "update project set deleted_at = now() where id = $1 and deleted_at is null",
        id
    )
    .execute(connection)
    .await?
    .rows_affected();

    if affected == 0 {
        return Err(DomainError::NotFound {
            target: "Project",
            identifier: id.to_string(),
        })?;
    }

    Ok(())
}

// #
// env

pub async fn list_env(executor: impl PgExecutor<'_>, project_id: Uuid) -> Result<Vec<Env>, AppError> {
    let rows = sqlx::query!(
        "select key, value, secret from project_env where project_id = $1 order by key",
        project_id
    )
    .fetch_all(executor)
    .await?;

    rows.into_iter()
        .map(|row| {
            Ok(Env {
                key: Key::from_str(&row.key)?,
                value: Secret::open(&row.value)?,
                secret: row.secret,
            })
        })
        .collect()
}

pub async fn upsert_env(
    connection: &mut PgConnection,
    project_id: Uuid,
    entries: &[Env],
) -> Result<(), AppError> {
    for entry in entries {
        sqlx::query!(
            r#"insert into project_env (project_id, key, value, secret)
               values ($1, $2, $3, $4)
               on conflict (project_id, key) do update
               set value = $3, secret = $4, updated_at = now()"#,
            project_id,
            entry.key.to_str(),
            entry.value.seal(),
            entry.secret
        )
        .execute(&mut *connection)
        .await?;
    }

    touch_env(connection, project_id).await
}

pub async fn remove_env(
    connection: &mut PgConnection,
    project_id: Uuid,
    key: &Key,
) -> Result<(), AppError> {
    let affected = sqlx::query!(
        "delete from project_env where project_id = $1 and key = $2",
        project_id,
        key.to_str()
    )
    .execute(&mut *connection)
    .await?
    .rows_affected();

    if affected == 0 {
        return Err(DomainError::NotFound {
            target: "EnvKey",
            identifier: key.to_str().to_owned(),
        })?;
    }

    touch_env(connection, project_id).await
}

async fn touch_env(connection: &mut PgConnection, project_id: Uuid) -> Result<(), AppError> {
    sqlx::query!(
        "update project set env_updated_at = now() where id = $1",
        project_id
    )
    .execute(connection)
    .await?;

    Ok(())
}

// #
// port claim

/// 예약대장은 스캔의 사본이 아니다 — 컨테이너가 꺼져 있어도 점유가 유지된다.
/// 예약 밖에서 누가 실제로 듣고 있는 포트(남의 프로세스)도 피한다 — 충돌은 여기서 걸러진다.
pub async fn claim_port(
    connection: &mut PgConnection,
    project_id: Option<Uuid>,
    reason: &str,
) -> Result<Port, AppError> {
    let occupied: Vec<i32> = host::scan_listeners()
        .await
        .into_iter()
        .map(|listener| i32::from(listener.port))
        .collect();

    let row = sqlx::query!(
        r#"with candidate as (
               select generate_series(20000, 20999) as port
               except
               select port from host_port_claim
               except
               select unnest($3::int[])
           )
           insert into host_port_claim (port, project_id, reason)
           select port, $1, $2 from candidate order by port limit 1
           returning port"#,
        project_id,
        reason,
        &occupied
    )
    .fetch_optional(connection)
    .await?;

    let row = row.ok_or(DomainError::NoFreePort)?;

    Port::from_i32(row.port).map_err(Into::into)
}

pub async fn list_ports(connection: &mut PgConnection, project_id: Uuid) -> Result<Vec<u16>, AppError> {
    let rows = sqlx::query!(
        "select port from host_port_claim where project_id = $1 order by port",
        project_id
    )
    .fetch_all(connection)
    .await?;

    Ok(rows.into_iter().map(|row| row.port as u16).collect())
}

pub async fn release_port(connection: &mut PgConnection, port: i32) -> Result<(), AppError> {
    sqlx::query!("delete from host_port_claim where port = $1", port)
        .execute(connection)
        .await?;

    Ok(())
}

pub async fn release_ports(
    connection: &mut PgConnection,
    project_id: Uuid,
) -> Result<(), AppError> {
    sqlx::query!(
        "delete from host_port_claim where project_id = $1",
        project_id
    )
    .execute(connection)
    .await?;

    Ok(())
}
