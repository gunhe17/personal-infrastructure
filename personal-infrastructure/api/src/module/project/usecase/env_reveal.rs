use uuid::Uuid;

use crate::behavior::scope::TokenScope;
use crate::module::project::domain::repository;
use crate::shared::exception::AppError;

pub use contract::project::EnvOutput as Output;

// #
// usecase

/// 평문. `TokenScope` 를 요구하므로 MCP 봉투(`AgentScope`)로는 도달할 수 없다 — 타입이 막는다.
pub async fn reveal(scope: &mut TokenScope, project_id: Uuid) -> Result<Vec<Output>, AppError> {
    repository::get_by_id(&mut *scope.transaction, project_id).await?;

    let listed = repository::list_env(&mut *scope.transaction, project_id).await?;

    Ok(listed.iter().map(|env| env.to_output(true)).collect())
}
