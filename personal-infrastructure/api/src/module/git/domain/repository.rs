use sqlx::PgConnection;
use sqlx::PgPool;
use uuid::Uuid;

use crate::module::common::exception::DomainError;
use crate::shared::exception::AppError;

// #
// entity

#[derive(Debug, Clone)]
pub struct Link {
    pub project_id: Uuid,
    pub repository: String,
    pub branch: String,
    pub auto_deploy: bool,
    pub secret: String,
}

// #
// query

pub async fn find(
    connection: &mut PgConnection,
    project_id: Uuid,
) -> Result<Option<Link>, AppError> {
    let found = sqlx::query_as!(
        Link,
        "select project_id, repository, branch, auto_deploy, secret from git_link where project_id = $1",
        project_id
    )
    .fetch_optional(connection)
    .await?;

    Ok(found)
}

pub async fn get(connection: &mut PgConnection, project_id: Uuid) -> Result<Link, AppError> {
    let found = find(connection, project_id).await?;

    Ok(found.ok_or(DomainError::NotFound {
        target: "GitLink",
        identifier: project_id.to_string(),
    })?)
}

/// 웹훅 핸들러가 트랜잭션 밖에서 부른다 — 서명 검증이 먼저다.
pub async fn get_by_pool(pool: &PgPool, project_id: Uuid) -> Result<Link, AppError> {
    let mut connection = pool.acquire().await?;

    get(&mut connection, project_id).await
}

// #
// command

pub async fn upsert(connection: &mut PgConnection, link: &Link) -> Result<(), AppError> {
    sqlx::query!(
        r#"insert into git_link (project_id, repository, branch, auto_deploy, secret)
           values ($1, $2, $3, $4, $5)
           on conflict (project_id) do update
           set repository = $2, branch = $3, auto_deploy = $4"#,
        link.project_id,
        link.repository,
        link.branch,
        link.auto_deploy,
        link.secret,
    )
    .execute(connection)
    .await?;

    Ok(())
}

pub async fn unlink(connection: &mut PgConnection, project_id: Uuid) -> Result<(), AppError> {
    sqlx::query!("delete from git_link where project_id = $1", project_id)
        .execute(connection)
        .await?;

    Ok(())
}
