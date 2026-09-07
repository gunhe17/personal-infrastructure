use sqlx::PgConnection;
use uuid::Uuid;

use contract::edge::RuleAction;

use crate::module::common::exception::DomainError;
use crate::module::edge::domain::repository;
use crate::shared::exception::AppError;

pub use contract::edge::RuleInput as Input;
pub use contract::edge::RuleOutput as Output;

// #
// usecase

/// 엣지 반영은 endpoint 가 커밋 뒤에 한다 — 트랜잭션 안에서 파일을 쓰지 않는다.
pub async fn add(connection: &mut PgConnection, input: Input) -> Result<Output, AppError> {
    // validate
    if !input.path_prefix.starts_with('/') {
        return Err(DomainError::InvalidFormat { target: "PathPrefix" })?;
    }

    if input.action == RuleAction::Allow && input.cidrs.is_empty() {
        return Err(DomainError::InvalidTransition {
            target: "RouteRule",
            actual: "allow 는 cidrs 가 하나 이상 필요합니다".to_owned(),
        })?;
    }

    let rule = Output {
        id: Uuid::new_v4(),
        domain_id: input.domain_id,
        path_prefix: input.path_prefix,
        action: input.action,
        rate_limit: input.rate_limit,
        cidrs: input.cidrs,
    };

    // persist
    repository::add(connection, &rule).await?;

    Ok(rule)
}
