use chrono::DateTime;
use chrono::Utc;
use sqlx::PgConnection;
use sqlx::PgPool;
use uuid::Uuid;

use contract::backup::TargetKind;

use crate::module::common::exception::DomainError;
use crate::module::common::exception::unique_or;
use crate::module::common::text;
use crate::shared::exception::AppError;

// #
// entity

#[derive(Debug, Clone)]
pub struct Schedule {
    pub id: Uuid,
    pub destination_id: Uuid,
    pub target_kind: TargetKind,
    pub target_id: Option<Uuid>,
    pub every_seconds: i64,
    pub last_run_at: Option<DateTime<Utc>>,
}

struct DestinationRow {
    id: Uuid,
    name: String,
    kind: String,
    location: String,
}

impl TryFrom<DestinationRow> for contract::backup::DestinationOutput {
    type Error = DomainError;

    fn try_from(row: DestinationRow) -> Result<Self, Self::Error> {
        Ok(Self {
            id: row.id,
            name: row.name,
            kind: text::parse("DestinationKind", &row.kind)?,
            location: row.location,
        })
    }
}

struct BackupRow {
    id: Uuid,
    target_kind: String,
    target_id: Option<Uuid>,
    artifact: Option<String>,
    size_bytes: Option<i64>,
    status: String,
    error: Option<String>,
    created_at: DateTime<Utc>,
    finished_at: Option<DateTime<Utc>>,
}

impl TryFrom<BackupRow> for contract::backup::Output {
    type Error = DomainError;

    fn try_from(row: BackupRow) -> Result<Self, Self::Error> {
        Ok(Self {
            id: row.id,
            target_kind: text::parse("TargetKind", &row.target_kind)?,
            target_id: row.target_id,
            artifact: row.artifact,
            size_bytes: row.size_bytes,
            status: text::parse("Status", &row.status)?,
            error: row.error,
            created_at: row.created_at,
            finished_at: row.finished_at,
        })
    }
}

struct ScheduleRow {
    id: Uuid,
    destination_id: Uuid,
    target_kind: String,
    target_id: Option<Uuid>,
    every_seconds: i64,
    last_run_at: Option<DateTime<Utc>>,
}

impl TryFrom<ScheduleRow> for Schedule {
    type Error = DomainError;

    fn try_from(row: ScheduleRow) -> Result<Self, Self::Error> {
        Ok(Self {
            id: row.id,
            destination_id: row.destination_id,
            target_kind: text::parse("TargetKind", &row.target_kind)?,
            target_id: row.target_id,
            every_seconds: row.every_seconds,
            last_run_at: row.last_run_at,
        })
    }
}

// #
// query · destination

pub async fn list_destinations(
    connection: &mut PgConnection,
) -> Result<Vec<contract::backup::DestinationOutput>, AppError> {
    let rows = sqlx::query_as!(
        DestinationRow,
        "select id, name, kind, location from backup_destination order by name"
    )
    .fetch_all(connection)
    .await?;

    Ok(rows
        .into_iter()
        .map(TryFrom::try_from)
        .collect::<Result<Vec<_>, _>>()?)
}

pub async fn get_destination(
    pool: &PgPool,
    id: Uuid,
) -> Result<contract::backup::DestinationOutput, AppError> {
    let row = sqlx::query_as!(
        DestinationRow,
        "select id, name, kind, location from backup_destination where id = $1",
        id
    )
    .fetch_optional(pool)
    .await?;

    let found = row.ok_or(DomainError::NotFound {
        target: "BackupDestination",
        identifier: id.to_string(),
    })?;

    Ok(found.try_into()?)
}

// #
// query · backup

pub async fn list_backups(
    connection: &mut PgConnection,
) -> Result<Vec<contract::backup::Output>, AppError> {
    let rows = sqlx::query_as!(
        BackupRow,
        r#"select id, target_kind, target_id, artifact, size_bytes, status, error,
                  created_at, finished_at
           from backup order by created_at desc limit 50"#
    )
    .fetch_all(connection)
    .await?;

    Ok(rows
        .into_iter()
        .map(TryFrom::try_from)
        .collect::<Result<Vec<_>, _>>()?)
}

pub async fn get_backup(pool: &PgPool, id: Uuid) -> Result<contract::backup::Output, AppError> {
    let row = sqlx::query_as!(
        BackupRow,
        r#"select id, target_kind, target_id, artifact, size_bytes, status, error,
                  created_at, finished_at
           from backup where id = $1"#,
        id
    )
    .fetch_optional(pool)
    .await?;

    let found = row.ok_or(DomainError::NotFound {
        target: "Backup",
        identifier: id.to_string(),
    })?;

    Ok(found.try_into()?)
}

/// 주기가 찬 것만 — 매 틱 전부 돌면 백업이 백업을 밀어낸다.
pub async fn list_due(pool: &PgPool) -> Result<Vec<Schedule>, AppError> {
    let rows = sqlx::query_as!(
        ScheduleRow,
        r#"select id, destination_id, target_kind, target_id, every_seconds, last_run_at
           from backup_schedule
           where last_run_at is null
              or last_run_at < now() - make_interval(secs => every_seconds::double precision)"#
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(TryFrom::try_from)
        .collect::<Result<Vec<_>, _>>()?)
}

// #
// command

pub async fn add_destination(
    connection: &mut PgConnection,
    destination: &contract::backup::DestinationOutput,
) -> Result<(), AppError> {
    sqlx::query!(
        "insert into backup_destination (id, name, kind, location) values ($1, $2, $3, $4)",
        destination.id,
        destination.name,
        text::of(&destination.kind),
        destination.location
    )
    .execute(connection)
    .await
    .map_err(|error| unique_or(error, "BackupDestination", &destination.name))?;

    Ok(())
}

pub async fn start(
    pool: &PgPool,
    id: Uuid,
    destination_id: Uuid,
    target_kind: TargetKind,
    target_id: Uuid,
) -> Result<(), AppError> {
    sqlx::query!(
        r#"insert into backup (id, destination_id, target_kind, target_id, status)
           values ($1, $2, $3, $4, 'running')"#,
        id,
        destination_id,
        text::of(&target_kind),
        target_id
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn succeed(
    pool: &PgPool,
    id: Uuid,
    artifact: &str,
    size_bytes: i64,
) -> Result<(), AppError> {
    sqlx::query!(
        r#"update backup set status = 'succeeded', artifact = $2, size_bytes = $3,
                  finished_at = now() where id = $1"#,
        id,
        artifact,
        size_bytes
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn fail(pool: &PgPool, id: Uuid, reason: &str) -> Result<(), AppError> {
    sqlx::query!(
        "update backup set status = 'failed', error = $2, finished_at = now() where id = $1",
        id,
        reason
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn add_schedule(
    connection: &mut PgConnection,
    schedule: &Schedule,
) -> Result<(), AppError> {
    sqlx::query!(
        r#"insert into backup_schedule
           (id, destination_id, target_kind, target_id, every_seconds)
           values ($1, $2, $3, $4, $5)"#,
        schedule.id,
        schedule.destination_id,
        text::of(&schedule.target_kind),
        schedule.target_id,
        schedule.every_seconds
    )
    .execute(connection)
    .await?;

    Ok(())
}

pub async fn mark_ran(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    sqlx::query!(
        "update backup_schedule set last_run_at = now() where id = $1",
        id
    )
    .execute(pool)
    .await?;

    Ok(())
}

/// 대상이 사라진 스케줄 — 지운 DB·볼륨의 예약은 같이 사라진다.
pub async fn remove_schedules_for(executor: impl sqlx::PgExecutor<'_>, target_id: Uuid) -> Result<(), AppError> {
    sqlx::query!("delete from backup_schedule where target_id = $1", target_id)
        .execute(executor)
        .await?;

    Ok(())
}
