use axum::http::StatusCode;

// #
// exception

#[derive(thiserror::Error, Debug)]
pub enum DomainError {
    #[error("{target} 형식이 올바르지 않습니다")]
    InvalidFormat { target: &'static str },

    #[error("{target} 찾을 수 없습니다 (식별자: {identifier})")]
    NotFound {
        target: &'static str,
        identifier: String,
    },

    #[error("{target} 이미 존재합니다 (식별자: {identifier})")]
    AlreadyExists {
        target: &'static str,
        identifier: String,
    },

    #[error("{target} 지금 상태에서 할 수 없는 작업입니다 (실제: {actual})")]
    InvalidTransition {
        target: &'static str,
        actual: String,
    },

    #[error("인증이 필요합니다 (조치: Authorization: Bearer <token>)")]
    Unauthenticated,

    #[error("권한이 없습니다 (필요: {required})")]
    Forbidden { required: &'static str },

    #[error("빈 포트를 찾지 못했습니다")]
    NoFreePort,
}

impl DomainError {
    pub fn status(&self) -> StatusCode {
        match self {
            Self::InvalidFormat { .. } | Self::InvalidTransition { .. } => StatusCode::BAD_REQUEST,
            Self::NotFound { .. } => StatusCode::NOT_FOUND,
            Self::AlreadyExists { .. } => StatusCode::CONFLICT,
            Self::Unauthenticated => StatusCode::UNAUTHORIZED,
            Self::Forbidden { .. } => StatusCode::FORBIDDEN,
            Self::NoFreePort => StatusCode::CONFLICT,
        }
    }
}

// #
// database

/// insert 의 unique violation 을 AlreadyExists 로. 나머지 DB 오류는 그대로 5xx.
pub fn unique_or(
    error: sqlx::Error,
    target: &'static str,
    identifier: &str,
) -> crate::shared::exception::AppError {
    match &error {
        sqlx::Error::Database(db) if db.is_unique_violation() => DomainError::AlreadyExists {
            target,
            identifier: identifier.to_owned(),
        }
        .into(),
        _ => error.into(),
    }
}
