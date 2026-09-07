use axum::Json;
use axum::extract::Path;
use axum::extract::Query;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use serde::Deserialize;
use uuid::Uuid;

use crate::behavior;
use crate::behavior::Scope;
use crate::infrastructure::database;
use crate::module::edge::domain::reconcile;
use crate::module::edge::usecase;
use crate::shared::exception::AppError;

// #
// rule

#[derive(Deserialize)]
pub struct RuleQuery {
    pub domain_id: Option<Uuid>,
}

pub async fn get_rules(
    headers: HeaderMap,
    Query(query): Query<RuleQuery>,
) -> Result<Json<Vec<usecase::rule_list::Output>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::ProjectRead, async |scope| {
        usecase::rule_list::list(&mut scope.transaction, query.domain_id).await
    })
    .await?;

    Ok(Json(listed))
}

pub async fn post_rule(
    headers: HeaderMap,
    Json(body): Json<usecase::rule_add::Input>,
) -> Result<(StatusCode, Json<usecase::rule_add::Output>), AppError> {
    let added = behavior::request_token(&headers, Scope::DomainWrite, async |scope| {
        usecase::rule_add::add(&mut scope.transaction, body).await
    })
    .await?;

    // 커밋 뒤에 엣지를 다시 그린다
    reconcile::run(database::pool()).await?;

    Ok((StatusCode::CREATED, Json(added)))
}

pub async fn delete_rule(headers: HeaderMap, Path(id): Path<Uuid>) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::DomainWrite, async |scope| {
        usecase::rule_remove::remove(&mut scope.transaction, id).await
    })
    .await?;

    reconcile::run(database::pool()).await?;

    Ok(StatusCode::NO_CONTENT)
}

// #
// edge

pub async fn get_vhosts(headers: HeaderMap) -> Result<Json<Vec<usecase::vhosts::Output>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::SystemAdmin, async |_| {
        usecase::vhosts::vhosts().await
    })
    .await?;

    Ok(Json(listed))
}

pub async fn post_reload(headers: HeaderMap) -> Result<Json<usize>, AppError> {
    let count = behavior::request_token(&headers, Scope::SystemAdmin, async |_| {
        usecase::reload::reload().await
    })
    .await?;

    Ok(Json(count))
}
