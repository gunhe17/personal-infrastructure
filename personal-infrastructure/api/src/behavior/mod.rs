pub mod access;
pub mod scope;
pub mod worker;

use axum::http::HeaderMap;

use crate::behavior::scope::AgentScope;
use crate::behavior::scope::RequestScope;
use crate::behavior::scope::TokenScope;
use sqlx::Postgres;
use sqlx::Transaction;

use crate::infrastructure::database;
use crate::module::audit::domain::repository as audit;
use crate::shared::exception::AppError;

pub use contract::token::AgentScope as AgentPermission;
pub use contract::token::Scope;

// #
// transaction

/// behavior 와 그 자식 모듈에서만 보인다. 트랜잭션 진입점은 봉투뿐이다 [INV-5].
async fn begin() -> Result<Transaction<'static, Postgres>, AppError> {
    let transaction = database::pool().begin().await?;

    Ok(transaction)
}

// #
// request

/// 공개 — 헬스체크, 웹훅(서명 검증이 인증을 대신).
pub async fn request<T>(
    handle: impl AsyncFnOnce(&mut RequestScope) -> Result<T, AppError>,
) -> Result<T, AppError> {
    let mut scope = RequestScope {
        transaction: begin().await?,
    };

    // yield
    let handled = handle(&mut scope).await?;

    scope.transaction.commit().await?;

    Ok(handled)
}

// #
// request token

pub async fn request_token<T>(
    headers: &HeaderMap,
    required: Scope,
    handle: impl AsyncFnOnce(&mut TokenScope) -> Result<T, AppError>,
) -> Result<T, AppError> {
    let mut transaction = begin().await?;

    // authenticate
    let token = access::authenticate_token(&mut transaction, headers).await?;

    // authorize
    access::authorize_scope(&token, required)?;

    let mut scope = TokenScope {
        transaction,
        token_id: token.id,
    };

    // yield
    let handled = handle(&mut scope).await?;

    // audit — endpoint 가 잊을 수 없는 자리. 무엇을(스코프) 누가(토큰) 언제
    access::touch(&mut scope.transaction, scope.token_id).await?;
    audit::record(&mut scope.transaction, Some(scope.token_id), "api", required.as_str()).await?;

    scope.transaction.commit().await?;

    Ok(handled)
}

// #
// request agent

/// MCP 툴의 봉투. 같은 PAT·같은 검사지만 요구할 수 있는 스코프가 `AgentPermission` 으로 좁다.
pub async fn request_agent<T>(
    headers: &HeaderMap,
    required: AgentPermission,
    handle: impl AsyncFnOnce(&mut AgentScope) -> Result<T, AppError>,
) -> Result<T, AppError> {
    let mut transaction = begin().await?;

    // authenticate · authorize
    let token = access::authenticate_token(&mut transaction, headers).await?;
    access::authorize_scope(&token, required.to_scope())?;

    let mut scope = AgentScope {
        transaction,
        token_id: token.id,
    };

    // yield
    let handled = handle(&mut scope).await?;

    // audit — 출처를 mcp 로 남긴다
    access::touch(&mut scope.transaction, scope.token_id).await?;
    audit::record(&mut scope.transaction, Some(scope.token_id), "mcp", required.to_scope().as_str()).await?;

    scope.transaction.commit().await?;

    Ok(handled)
}
