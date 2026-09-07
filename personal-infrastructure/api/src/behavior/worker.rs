use crate::behavior::begin;
use crate::behavior::scope::WorkerScope;
use crate::infrastructure::database;
use crate::module::job::domain::Job;
use crate::module::job::domain::JobKind;
use crate::module::job::domain::repository;
use crate::shared::exception::AppError;

// #
// job

/// claim → scope → succeed/fail. 서버 봉투와 같은 결이다.
pub async fn with_job<T>(
    kind: JobKind,
    handle: impl AsyncFnOnce(&mut WorkerScope, Job) -> Result<T, AppError>,
) -> Result<Option<T>, AppError> {
    let mut transaction = begin().await?;

    // claim
    let Some(claimed) = repository::claim(&mut transaction, kind).await? else {
        return Ok(None);
    };

    transaction.commit().await?;

    let mut scope = WorkerScope {
        transaction: begin().await?,
        job_id: claimed.id,
    };

    // succeed / fail
    match handle(&mut scope, claimed.clone()).await {
        Ok(handled) => {
            repository::succeed(&mut scope.transaction, claimed.id).await?;
            scope.transaction.commit().await?;

            Ok(Some(handled))
        }
        Err(error) => {
            // 롤백된 트랜잭션 밖에서 새 커넥션으로 — 같이 롤백되면 job 이 영원히 재시도된다
            drop(scope);
            repository::fail(database::pool(), claimed.id, &error.to_string()).await?;

            Err(error)
        }
    }
}
