use std::sync::Arc;

use rmcp::ServerHandler;
use rmcp::handler::server::tool::ToolRouter;
use rmcp::model::Implementation;
use rmcp::model::ServerCapabilities;
use rmcp::model::ServerInfo;
use rmcp::tool_handler;
use rmcp::transport::streamable_http_server::StreamableHttpServerConfig;
use rmcp::transport::streamable_http_server::StreamableHttpService;
use rmcp::transport::streamable_http_server::session::local::LocalSessionManager;

// #
// agent

/// MCP 어댑터 — 데몬 안에 산다. 툴은 모듈마다 `endpoint/mcp.rs` 가 `Agent::<module>_tools()` 로 내고,
/// 합성은 `bin/server.rs` 에서 [INV-14].
pub struct Agent {
    tool_router: ToolRouter<Self>,
}

impl Agent {
    pub fn new(tool_router: ToolRouter<Self>) -> Self {
        Self { tool_router }
    }
}

#[tool_handler(router = self.tool_router)]
impl ServerHandler for Agent {
    fn get_info(&self) -> ServerInfo {
        ServerInfo::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(Implementation::new("personal-infrastructure", env!("CARGO_PKG_VERSION")))
            .with_instructions(
            "personal-infrastructure 홈서버. 프로젝트를 만들고 배포하고 도메인을 붙인다. \
             비밀값은 마스킹돼 나오며 이 채널로는 열 수 없다.",
        )
    }
}

// #
// service

/// `/mcp` 에 마운트한다. 인증은 툴마다 `request_agent` 봉투가 Bearer 를 다시 본다.
pub fn service(tool_router: ToolRouter<Agent>) -> StreamableHttpService<Agent, LocalSessionManager> {
    // 세션 없이, JSON 으로 — 툴은 전부 요청-응답이라 SSE 도 세션도 필요 없다. curl 로도 읽힌다
    let mut config = StreamableHttpServerConfig::default();
    config.legacy_session_mode = false;
    config.json_response = true;

    StreamableHttpService::new(
        move || Ok(Agent::new(tool_router.clone())),
        Arc::new(LocalSessionManager::default()),
        config,
    )
}

// #
// text

/// 툴 결과는 JSON 텍스트 — 스키마를 contract 에 강요하지 않는다.
pub fn text<T: serde::Serialize>(value: &T) -> Result<String, rmcp::ErrorData> {
    serde_json::to_string_pretty(value)
        .map_err(|error| rmcp::ErrorData::internal_error(error.to_string(), None))
}
