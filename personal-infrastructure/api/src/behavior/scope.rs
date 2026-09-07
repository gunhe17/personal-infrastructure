use sqlx::Postgres;
use sqlx::Transaction;
use uuid::Uuid;

// #
// scope

pub struct RequestScope {
    pub transaction: Transaction<'static, Postgres>,
}

pub struct TokenScope {
    pub transaction: Transaction<'static, Postgres>,
    pub token_id: Uuid,
}

pub struct WorkerScope {
    pub transaction: Transaction<'static, Postgres>,
    pub job_id: Uuid,
}

/// MCP 툴이 받는 봉투. `TokenScope` 를 요구하는 usecase(평문 열람)는 이걸로 못 부른다.
pub struct AgentScope {
    pub transaction: Transaction<'static, Postgres>,
    pub token_id: Uuid,
}
