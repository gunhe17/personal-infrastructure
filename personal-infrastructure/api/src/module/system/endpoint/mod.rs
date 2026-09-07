use axum::Json;
use axum::http::HeaderMap;

use crate::behavior;
use crate::behavior::Scope;
use crate::infrastructure::database;
use crate::infrastructure::host::client as host;
use crate::module::system::domain::doctor;
use crate::module::system::domain::status;
use crate::shared::exception::AppError;

// #
// query

pub async fn get_health() -> &'static str {
    "ok"
}

pub async fn get_status(headers: HeaderMap) -> Result<Json<contract::system::Status>, AppError> {
    let summarized = behavior::request_token(&headers, Scope::ProjectRead, async |_| {
        status::summarize(database::pool()).await
    })
    .await?;

    Ok(Json(summarized))
}

pub async fn get_ports(
    headers: HeaderMap,
) -> Result<Json<Vec<contract::system::PortClaim>>, AppError> {
    let claims = behavior::request_token(&headers, Scope::ProjectRead, async |_| {
        status::port_claims(database::pool()).await
    })
    .await?;

    Ok(Json(claims))
}

/// 호스트 전체 스캔 — 우리 것이 아닌 리스너까지 보여준다.
pub async fn get_listeners(
    headers: HeaderMap,
) -> Result<Json<Vec<contract::system::Listener>>, AppError> {
    let scanned = behavior::request_token(&headers, Scope::SystemAdmin, async |_| {
        Ok(host::scan_listeners().await)
    })
    .await?;

    Ok(Json(scanned))
}

/// 박스 점검 — `status` 가 앱이면 이건 박스다.
pub async fn get_doctor(headers: HeaderMap) -> Result<Json<Vec<contract::system::Check>>, AppError> {
    let checked = behavior::request_token(&headers, Scope::SystemAdmin, async |_| {
        Ok(doctor::run(database::pool()).await)
    })
    .await?;

    Ok(Json(checked))
}

pub mod mcp;
