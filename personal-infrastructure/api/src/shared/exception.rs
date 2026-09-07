use axum::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::response::Response;
use serde_json::json;
use uuid::Uuid;

use crate::infrastructure::acme::exception::AcmeError;
use crate::infrastructure::edge::exception::EdgeError;
use crate::infrastructure::process::ProcessError;
use crate::module::common::exception::DomainError;

// #
// exception

#[derive(thiserror::Error, Debug)]
pub enum AppError {
    #[error(transparent)]
    Domain(#[from] DomainError),

    #[error(transparent)]
    Acme(#[from] AcmeError),

    #[error(transparent)]
    Edge(#[from] EdgeError),

    #[error(transparent)]
    Process(#[from] ProcessError),

    #[error("데이터베이스 실패 (원인: {0})")]
    Database(#[from] sqlx::Error),

    #[error("입출력 실패 (원인: {0})")]
    Io(#[from] std::io::Error),

    #[error("HTTP 요청 실패 (원인: {0})")]
    Http(#[from] reqwest::Error),
}

impl AppError {
    fn status(&self) -> StatusCode {
        match self {
            Self::Domain(error) => error.status(),
            // 발급 실패는 서버 버그가 아니라 바깥 사정(certbot 없음, DNS 안 가리킴) — 원인을 보여준다
            Self::Acme(_) => StatusCode::FAILED_DEPENDENCY,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

// #
// handler

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status();

        // 5xx 는 원문 노출 금지 — error_id 로만 로그와 연결한다
        if status.is_server_error() {
            let error_id = Uuid::new_v4();
            tracing::error!(%error_id, error = %self, "internal");

            return (status, Json(json!({ "error_id": error_id }))).into_response();
        }

        (status, Json(json!({ "error": self.to_string() }))).into_response()
    }
}

// #
// mcp

/// 툴 오류도 같은 규칙 — 4xx 는 메시지, 5xx 는 error_id 만.
impl From<AppError> for rmcp::ErrorData {
    fn from(error: AppError) -> Self {
        let status = error.status();

        if status.is_server_error() {
            let error_id = Uuid::new_v4();
            tracing::error!(%error_id, error = %error, "internal");

            return rmcp::ErrorData::internal_error(
                format!("서버 오류입니다 (error_id: {error_id})"),
                None,
            );
        }

        rmcp::ErrorData::invalid_params(error.to_string(), None)
    }
}
