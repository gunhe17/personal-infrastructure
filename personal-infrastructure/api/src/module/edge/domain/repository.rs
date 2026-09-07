use sqlx::PgConnection;
use sqlx::PgPool;
use uuid::Uuid;

use contract::edge::RuleOutput;

use crate::infrastructure::edge::render::Rule;
use crate::module::common::exception::DomainError;
use crate::module::common::text;
use crate::shared::exception::AppError;

struct Row {
    id: Uuid,
    domain_id: Uuid,
    path_prefix: String,
    action: String,
    rate_limit: Option<i32>,
    cidrs: Vec<String>,
}

impl TryFrom<Row> for RuleOutput {
    type Error = DomainError;

    fn try_from(row: Row) -> Result<Self, Self::Error> {
        Ok(Self {
            id: row.id,
            domain_id: row.domain_id,
            path_prefix: row.path_prefix,
            action: text::parse("RuleAction", &row.action)?,
            rate_limit: row.rate_limit,
            cidrs: row.cidrs,
        })
    }
}

// #
// query

pub async fn list(
    connection: &mut PgConnection,
    domain_id: Option<Uuid>,
) -> Result<Vec<RuleOutput>, AppError> {
    let rows = sqlx::query_as!(
        Row,
        r#"select id, domain_id, path_prefix, action, rate_limit, cidrs from route_rule
           where $1::uuid is null or domain_id = $1 order by domain_id, path_prefix"#,
        domain_id
    )
    .fetch_all(connection)
    .await?;

    Ok(rows.into_iter().map(TryFrom::try_from).collect::<Result<Vec<_>, _>>()?)
}

/// 엣지 재생성이 부른다 — 렌더 입력 형태로.
pub async fn rules_for(pool: &PgPool, domain_id: Uuid) -> Result<Vec<Rule>, AppError> {
    let rows = sqlx::query_as!(
        Row,
        r#"select id, domain_id, path_prefix, action, rate_limit, cidrs from route_rule
           where domain_id = $1 order by path_prefix"#,
        domain_id
    )
    .fetch_all(pool)
    .await?;

    rows.into_iter()
        .map(|row| {
            Ok(Rule {
                path_prefix: row.path_prefix,
                action: text::parse("RuleAction", &row.action)?,
                rate_limit: row.rate_limit,
                cidrs: row.cidrs,
            })
        })
        .collect()
}

// #
// command

pub async fn add(connection: &mut PgConnection, rule: &RuleOutput) -> Result<(), AppError> {
    sqlx::query!(
        r#"insert into route_rule (id, domain_id, path_prefix, action, rate_limit, cidrs)
           values ($1, $2, $3, $4, $5, $6)"#,
        rule.id,
        rule.domain_id,
        rule.path_prefix,
        text::of(&rule.action),
        rule.rate_limit,
        &rule.cidrs
    )
    .execute(connection)
    .await?;

    Ok(())
}

pub async fn remove(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    let affected = sqlx::query!("delete from route_rule where id = $1", id)
        .execute(connection)
        .await?
        .rows_affected();

    if affected == 0 {
        return Err(DomainError::NotFound {
            target: "RouteRule",
            identifier: id.to_string(),
        })?;
    }

    Ok(())
}

