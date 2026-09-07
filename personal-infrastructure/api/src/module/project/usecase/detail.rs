use std::time::Duration;

use sqlx::PgConnection;
use uuid::Uuid;

use crate::infrastructure::git::client as git;
use crate::module::git::domain::repository as link_repository;
use crate::module::project::domain::Source;
use crate::module::project::domain::repository;
use crate::shared::exception::AppError;

pub use contract::project::Detail as Output;

// #
// usecase

/// 상세만 원격 HEAD 를 물어본다 — 5초 안에 답이 없으면 모른다고 한다.
pub async fn detail(connection: &mut PgConnection, id: Uuid) -> Result<Output, AppError> {
    // find
    let found = repository::get_by_id(&mut *connection, id).await?;

    let remote_commit = match &found.source {
        Source::Git(repository) => {
            let branch = link_repository::find(connection, id)
                .await?
                .map(|link| link.branch)
                .unwrap_or_else(|| "main".to_owned());

            tokio::time::timeout(Duration::from_secs(5), git::remote_head(repository, &branch))
                .await
                .ok()
                .flatten()
        }
        Source::Folder(_) | Source::Image(_) => None,
    };

    // return
    Ok(Output {
        project: found.to_output(),
        remote_commit,
    })
}
