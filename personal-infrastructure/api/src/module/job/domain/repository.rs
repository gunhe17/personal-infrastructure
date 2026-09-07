use sqlx::PgConnection;
use sqlx::PgPool;
use uuid::Uuid;

use crate::module::common::text;
use crate::module::job::domain::Job;
use crate::module::job::domain::JobKind;
use crate::shared::exception::AppError;

/// 워커가 죽으면 claim 만 남는다. 이 시간을 넘긴 claim 은 다른 워커가 다시 집는다.
const LEASE_SECONDS: f64 = 600.0;

// #
// command

pub async fn enqueue(connection: &mut PgConnection, job: &Job) -> Result<(), AppError> {
    sqlx::query!(
        "insert into job (id, kind, target_id, status, created_at) values ($1, $2, $3, 'pending', $4)",
        job.id,
        text::of(&job.kind),
        job.target_id,
        job.created_at,
    )
    .execute(connection)
    .await?;

    Ok(())
}

/// `for update skip locked` 가 동시 claim 을, lease 가 죽은 워커를 막는다.
pub async fn claim(connection: &mut PgConnection, kind: JobKind) -> Result<Option<Job>, AppError> {
    let row = sqlx::query!(
        r#"update job
           set status = 'running', claimed_at = now(), attempts = attempts + 1
           where id = (
               select id from job
               where kind = $1
                 and (status = 'pending'
                      or (status = 'running' and claimed_at < now() - make_interval(secs => $2)))
               order by created_at
               for update skip locked
               limit 1
           )
           returning id, kind, target_id, created_at"#,
        text::of(&kind),
        LEASE_SECONDS,
    )
    .fetch_optional(connection)
    .await?;

    let Some(row) = row else {
        return Ok(None);
    };

    Ok(Some(Job {
        id: row.id,
        kind: text::parse("JobKind", &row.kind)?,
        target_id: row.target_id,
        created_at: row.created_at,
    }))
}

pub async fn succeed(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    sqlx::query!("update job set status = 'succeeded' where id = $1", id)
        .execute(connection)
        .await?;

    Ok(())
}

/// 롤백된 트랜잭션 밖에서 부른다 — 같이 롤백되면 job 이 영원히 재시도된다.
pub async fn fail(pool: &PgPool, id: Uuid, reason: &str) -> Result<(), AppError> {
    sqlx::query!(
        "update job set status = 'failed', error = $2 where id = $1",
        id,
        reason
    )
    .execute(pool)
    .await?;

    Ok(())
}

// #
// query

/// 60초 넘게 아무도 안 집어간 job — 워커가 안 돈다는 뜻이다.
pub async fn count_stale_pending(pool: &PgPool) -> Result<i64, AppError> {
    let row = sqlx::query!(
        "select count(*) as count from job where status = 'pending' and created_at < now() - interval '60 seconds'"
    )
    .fetch_one(pool)
    .await?;

    Ok(row.count.unwrap_or(0))
}

pub async fn list_recent(connection: &mut PgConnection) -> Result<Vec<contract::system::JobOutput>, AppError> {
    let listed = sqlx::query_as!(
        contract::system::JobOutput,
        r#"select id, kind, target_id, status, attempts, error, created_at from job
           order by created_at desc limit 50"#
    )
    .fetch_all(connection)
    .await?;

    Ok(listed)
}

pub async fn cancel_for_target(connection: &mut PgConnection, target_id: Uuid) -> Result<(), AppError> {
    sqlx::query!(
        "update job set status = 'cancelled' where target_id = $1 and status = 'pending'",
        target_id
    )
    .execute(connection)
    .await?;

    Ok(())
}
