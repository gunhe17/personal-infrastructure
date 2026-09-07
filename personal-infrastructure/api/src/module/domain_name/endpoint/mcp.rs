use http::request::Parts;
use rmcp::ErrorData;
use rmcp::handler::server::tool::Extension;
use rmcp::handler::server::wrapper::Parameters;
use rmcp::tool;
use rmcp::tool_router;
use schemars::JsonSchema;
use serde::Deserialize;
use uuid::Uuid;

use crate::behavior;
use crate::behavior::AgentPermission;
use crate::infrastructure::database;
use crate::mcp::Agent;
use crate::mcp::text;
use crate::module::domain_name::usecase;
use crate::module::edge::domain::reconcile;

// #
// parameter

#[derive(Deserialize, JsonSchema)]
pub struct Attach {
    pub project_id: Uuid,
    /// app.example.com
    pub host: String,
    /// none | acme | manual | self_signed. 비우면 acme
    pub tls_mode: Option<String>,
    /// 비우면 /
    pub path_prefix: Option<String>,
}

// #
// tool

#[tool_router(router = domain_tools, vis = "pub")]
impl Agent {
    #[tool(description = "도메인 목록 — 어느 프로젝트에 어떤 TLS 로 붙어 있고 라우팅됐는지")]
    async fn domain_list(&self, Extension(parts): Extension<Parts>) -> Result<String, ErrorData> {
        let listed = behavior::request_agent(&parts.headers, AgentPermission::ProjectRead, async |scope| {
            usecase::list::list(&mut scope.transaction).await
        })
        .await?;

        text(&listed)
    }

    #[tool(description = "프로젝트에 도메인 연결 — vhost 자동 생성, 인증서는 워커가 발급")]
    async fn domain_attach(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(input): Parameters<Attach>,
    ) -> Result<String, ErrorData> {
        let tls_mode = match input.tls_mode.as_deref() {
            None => contract::domain_name::TlsMode::Acme,
            Some(raw) => contract::text::parse(raw)
                .ok_or_else(|| ErrorData::invalid_params(format!("알 수 없는 tls_mode: {raw}"), None))?,
        };
        let body = contract::domain_name::AttachInput {
            project_id: input.project_id,
            host: input.host,
            path_prefix: input.path_prefix,
            tls_mode,
        };

        let attached = behavior::request_agent(&parts.headers, AgentPermission::DomainWrite, async |scope| {
            usecase::attach::attach(&mut scope.transaction, body).await
        })
        .await?;

        // 커밋 뒤에 엣지를 다시 그린다 — HTTP 엔드포인트와 같은 순서
        reconcile::run(database::pool()).await.map_err(ErrorData::from)?;

        text(&attached)
    }
}
