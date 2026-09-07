use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::git::domain::repository;
use crate::module::git::domain::repository::Link;
use crate::module::project::domain::repository as project_repository;
use crate::shared::exception::AppError;

pub use contract::git::LinkInput as Input;
pub use contract::git::Output;

// #
// usecase

pub async fn link(connection: &mut PgConnection, input: Input) -> Result<Output, AppError> {
    // find
    project_repository::get_by_id(&mut *connection, input.project_id).await?;

    // build — 웹훅 시크릿은 프로젝트마다 새로 만든다
    let existing = repository::find(connection, input.project_id).await?;
    let secret = existing
        .map(|link| link.secret)
        .unwrap_or_else(|| Uuid::new_v4().simple().to_string());

    let stored = Link {
        project_id: input.project_id,
        repository: input.repository.clone(),
        branch: input.branch.clone().unwrap_or_else(|| "main".to_owned()),
        auto_deploy: input.auto_deploy,
        secret,
    };

    // persist
    repository::upsert(connection, &stored).await?;

    // return
    let linked = Output {
        project_id: stored.project_id,
        repository: stored.repository.clone(),
        branch: stored.branch.clone(),
        auto_deploy: stored.auto_deploy,
        webhook_path: format!("/webhooks/git/{}", stored.project_id),
        webhook_secret: stored.secret.clone(),
    };

    Ok(linked)
}
