use http::request::Parts;
use rmcp::ErrorData;
use rmcp::handler::server::tool::Extension;
use rmcp::tool;
use rmcp::tool_router;

use crate::behavior;
use crate::behavior::AgentPermission;
use crate::infrastructure::database;
use crate::mcp::Agent;
use crate::mcp::text;
use crate::module::monitoring::domain::repository as monitoring_repository;
use crate::module::system::domain::status;

// #
// tool

#[tool_router(router = system_tools, vis = "pub")]
impl Agent {
    #[tool(description = "한눈에 — 프로젝트 수, 돌고 있는 수, 오늘 배포, 열린 문제, 엣지 상태")]
    async fn status(&self, Extension(parts): Extension<Parts>) -> Result<String, ErrorData> {
        let summarized = behavior::request_agent(&parts.headers, AgentPermission::ProjectRead, async |_| {
            status::summarize(database::pool()).await
        })
        .await?;

        text(&summarized)
    }

    #[tool(description = "지금 열려 있는 문제 — 멈춘 컨테이너, 안 듣는 포트, 외부 노출, 엣지")]
    async fn issues(&self, Extension(parts): Extension<Parts>) -> Result<String, ErrorData> {
        let listed = behavior::request_agent(&parts.headers, AgentPermission::ProjectRead, async |scope| {
            monitoring_repository::list_open(&mut scope.transaction).await
        })
        .await?;

        text(&listed)
    }

    #[tool(description = "포트 예약대장 — 예약과 실제 리스닝을 나란히")]
    async fn ports(&self, Extension(parts): Extension<Parts>) -> Result<String, ErrorData> {
        let claims = behavior::request_agent(&parts.headers, AgentPermission::ProjectRead, async |_| {
            status::port_claims(database::pool()).await
        })
        .await?;

        text(&claims)
    }
}
