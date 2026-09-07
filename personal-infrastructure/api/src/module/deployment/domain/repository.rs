use chrono::DateTime;
use chrono::Utc;
use sqlx::PgConnection;
use sqlx::PgPool;
use uuid::Uuid;

use crate::module::common::exception::DomainError;
use crate::module::common::text;
use crate::module::deployment::domain::Deployment;
use crate::module::deployment::domain::Status;
use crate::module::project::domain::Port;
use crate::shared::exception::AppError;

struct Row {
    id: Uuid,
    project_id: Uuid,
    status: String,
    trigger: String,
    stack: Option<String>,
    image_ref: Option<String>,
    host_port: Option<i32>,
    container_port: Option<i32>,
    commit: Option<String>,
    error: Option<String>,
    created_at: DateTime<Utc>,
    finished_at: Option<DateTime<Utc>>,
}

impl TryFrom<Row> for Deployment {
    type Error = DomainError;

    fn try_from(row: Row) -> Result<Self, Self::Error> {
        Ok(Self {
            id: row.id,
            project_id: row.project_id,
            status: text::parse("Status", &row.status)?,
            trigger: text::parse("Trigger", &row.trigger)?,
            stack: row.stack,
            image_ref: row.image_ref,
            host_port: row.host_port.map(Port::from_i32).transpose()?,
            container_port: row.container_port.map(Port::from_i32).transpose()?,
            commit: row.commit,
            error: row.error,
            created_at: row.created_at,
            finished_at: row.finished_at,
        })
    }
}


// #
// query

pub async fn list_by_project(
    connection: &mut PgConnection,
    project_id: Uuid,
    limit: i64,
) -> Result<Vec<Deployment>, AppError> {
    let rows = sqlx::query_as!(
        Row,
        r#"select id, project_id, status, trigger, stack, image_ref, host_port, container_port,
                  commit, error, created_at, finished_at
           from deployment where project_id = $1 order by created_at desc limit $2"#,
        project_id,
        limit
    )
    .fetch_all(connection)
    .await?;

    Ok(rows
        .into_iter()
        .map(Deployment::try_from)
        .collect::<Result<Vec<_>, _>>()?)
}

pub async fn get_by_id(connection: &mut PgConnection, id: Uuid) -> Result<Deployment, AppError> {
    let row = sqlx::query_as!(
        Row,
        r#"select id, project_id, status, trigger, stack, image_ref, host_port, container_port,
                  commit, error, created_at, finished_at
           from deployment where id = $1"#,
        id
    )
    .fetch_optional(connection)
    .await?;

    let found = row.ok_or(DomainError::NotFound {
        target: "Deployment",
        identifier: id.to_string(),
    })?;

    Ok(Deployment::try_from(found)?)
}

/// 지금 돌고 있는 배포 — restart 의 stale 판정이 이 시각과 env 변경 시각을 비교한다.
pub async fn find_current(
    connection: &mut PgConnection,
    project_id: Uuid,
) -> Result<Option<Deployment>, AppError> {
    let row = sqlx::query_as!(
        Row,
        r#"select id, project_id, status, trigger, stack, image_ref, host_port, container_port,
                  commit, error, created_at, finished_at
           from deployment where project_id = $1 and status = 'running'
           order by created_at desc limit 1"#,
        project_id
    )
    .fetch_optional(connection)
    .await?;

    Ok(row.map(Deployment::try_from).transpose()?)
}

// #
// command

pub async fn add(connection: &mut PgConnection, deployment: &Deployment) -> Result<(), AppError> {
    sqlx::query!(
        r#"insert into deployment
           (id, project_id, status, trigger, stack, image_ref, container_port, commit, created_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#,
        deployment.id,
        deployment.project_id,
        text::of(&deployment.status),
        text::of(&deployment.trigger),
        deployment.stack,
        deployment.image_ref,
        deployment.container_port.map(Port::to_i32),
        deployment.commit,
        deployment.created_at,
    )
    .execute(connection)
    .await?;

    Ok(())
}

pub async fn update_status(pool: &PgPool, id: Uuid, status: Status) -> Result<(), AppError> {
    sqlx::query!(
        r#"update deployment
           set status = $2,
               started_at = coalesce(started_at, case when $2 <> 'queued' then now() end),
               finished_at = case when $3 then now() else finished_at end
           where id = $1"#,
        id,
        text::of(&status),
        status.is_final(),
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn update_detected(pool: &PgPool, id: Uuid, stack: &str) -> Result<(), AppError> {
    sqlx::query!("update deployment set stack = $2 where id = $1", id, stack)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn update_commit(pool: &PgPool, id: Uuid, commit: &str) -> Result<(), AppError> {
    sqlx::query!("update deployment set commit = $2 where id = $1", id, commit)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn update_built(pool: &PgPool, id: Uuid, image_ref: &str) -> Result<(), AppError> {
    sqlx::query!(
        "update deployment set image_ref = $2 where id = $1",
        id,
        image_ref
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn update_started(
    pool: &PgPool,
    id: Uuid,
    container_id: &str,
    host_port: Port,
    container_port: Option<Port>,
) -> Result<(), AppError> {
    sqlx::query!(
        "update deployment set container_id = $2, host_port = $3, container_port = $4 where id = $1",
        id,
        container_id,
        host_port.to_i32(),
        container_port.map(Port::to_i32)
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn fail(pool: &PgPool, id: Uuid, reason: &str) -> Result<(), AppError> {
    sqlx::query!(
        "update deployment set status = 'failed', error = $2, finished_at = now() where id = $1",
        id,
        reason
    )
    .execute(pool)
    .await?;

    Ok(())
}

/// 새 배포가 성공하면 같은 프로젝트의 이전 running 을 내리고 **그 포트 예약을 반납한다.**
/// 반납하지 않으면 재배포마다 예약이 하나씩 새고, 20000~20999 가 결국 고갈된다.
pub async fn supersede(pool: &PgPool, project_id: Uuid, keep: Uuid) -> Result<(), AppError> {
    let superseded = sqlx::query!(
        r#"update deployment set status = 'superseded'
           where project_id = $1 and id <> $2 and status = 'running'
           returning host_port"#,
        project_id,
        keep
    )
    .fetch_all(pool)
    .await?;

    // 지금 배포가 쓰는 포트는 남긴다 — 롤백이 같은 포트를 다시 잡을 수 있다
    let released: Vec<i32> = superseded
        .into_iter()
        .filter_map(|row| row.host_port)
        .collect();

    if released.is_empty() {
        return Ok(());
    }

    sqlx::query!(
        r#"delete from host_port_claim
           where port = any($1)
             and port <> (select host_port from deployment where id = $2)"#,
        &released,
        keep
    )
    .execute(pool)
    .await?;

    Ok(())
}

/// 큐에 있을 때만 — 빌드가 시작된 배포는 프로세스를 쥔 워커만 끝낼 수 있다.
pub async fn cancel(connection: &mut PgConnection, id: Uuid) -> Result<bool, AppError> {
    let affected = sqlx::query!(
        "update deployment set status = 'cancelled', finished_at = now() where id = $1 and status = 'queued'",
        id
    )
    .execute(connection)
    .await?
    .rows_affected();

    Ok(affected > 0)
}
