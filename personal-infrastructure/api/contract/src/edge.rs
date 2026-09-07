use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

// #
// value

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RuleAction {
    /// 403
    Deny,
    /// 초당 10 요청, burst = rate_limit
    Limit,
    /// cidrs 만 통과, 나머지 403
    Allow,
}

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct RuleInput {
    pub domain_id: Uuid,
    pub path_prefix: String,
    pub action: RuleAction,
    #[serde(default)]
    pub rate_limit: Option<i32>,
    #[serde(default)]
    pub cidrs: Vec<String>,
}

// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct RuleOutput {
    pub id: Uuid,
    pub domain_id: Uuid,
    pub path_prefix: String,
    pub action: RuleAction,
    pub rate_limit: Option<i32>,
    pub cidrs: Vec<String>,
}

/// 엣지가 실제로 들고 있는 vhost 파일.
#[derive(Debug, Serialize, Deserialize)]
pub struct VhostOutput {
    pub host: String,
    pub body: String,
}
