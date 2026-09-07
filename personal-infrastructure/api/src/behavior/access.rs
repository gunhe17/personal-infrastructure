use axum::http::HeaderMap;
use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::common::exception::DomainError;
use crate::module::token::domain::Token;
use crate::module::token::domain::repository;
use crate::shared::exception::AppError;

pub use contract::token::Scope;

// #
// authenticate

pub async fn authenticate_token(
    connection: &mut PgConnection,
    headers: &HeaderMap,
) -> Result<Token, AppError> {
    let secret = headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or(DomainError::Unauthenticated)?;

    let authenticated = repository::find_by_secret(connection, secret)
        .await?
        .ok_or(DomainError::Unauthenticated)?;

    Ok(authenticated)
}

// #
// authorize

pub fn authorize_scope(token: &Token, required: Scope) -> Result<(), AppError> {
    if !token.allows(required) {
        return Err(DomainError::Forbidden {
            required: required.as_str(),
        }
        .into());
    }

    Ok(())
}

// #
// audit

pub async fn touch(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    repository::touch(connection, id).await?;

    Ok(())
}
