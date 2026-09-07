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
use crate::mcp::Agent;
use crate::mcp::text;
use crate::module::project::usecase;

// #
// parameter

#[derive(Deserialize, JsonSchema)]
pub struct ProjectId {
    pub project_id: Uuid,
}

#[derive(Deserialize, JsonSchema)]
pub struct Restart {
    pub project_id: Uuid,
    /// env 가 배포 뒤에 바뀌었어도 튕긴다
    #[serde(default)]
    pub force: bool,
}

#[derive(Deserialize, JsonSchema)]
pub struct EnvSet {
    pub project_id: Uuid,
    pub entries: Vec<EnvEntry>,
}

#[derive(Deserialize, JsonSchema)]
pub struct EnvEntry {
    pub key: String,
    pub value: String,
    /// 목록에서 마스킹
    #[serde(default)]
    pub secret: bool,
}

#[derive(Deserialize, JsonSchema)]
pub struct Create {
    /// [a-z0-9-] 40자 이하
    pub name: String,
    /// 절대 경로(폴더) 또는 git URL
    pub source: String,
    /// 컨테이너가 듣는 포트. 비우면 감지
    pub port: Option<u16>,
    /// 환경 묶음. 비우면 name
    pub group: Option<String>,
    /// production | staging | preview … 비우면 production
    pub environment: Option<String>,
}

// #
// tool

#[tool_router(router = project_tools, vis = "pub")]
impl Agent {
    #[tool(description = "프로젝트 목록 — 그룹/환경, 스택, 상태, 돌고 있는 커밋")]
    async fn project_list(&self, Extension(parts): Extension<Parts>) -> Result<String, ErrorData> {
        let listed = behavior::request_agent(&parts.headers, AgentPermission::ProjectRead, async |scope| {
            usecase::list::list(&mut scope.transaction).await
        })
        .await?;

        text(&listed)
    }

    #[tool(description = "프로젝트 상세 — 원격 HEAD 와의 드리프트까지")]
    async fn project_detail(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(input): Parameters<ProjectId>,
    ) -> Result<String, ErrorData> {
        let detailed = behavior::request_agent(&parts.headers, AgentPermission::ProjectRead, async |scope| {
            usecase::detail::detail(&mut scope.transaction, input.project_id).await
        })
        .await?;

        text(&detailed)
    }

    #[tool(description = "프로젝트 등록. 배포는 deploy_start 로 따로")]
    async fn project_create(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(input): Parameters<Create>,
    ) -> Result<String, ErrorData> {
        let source_kind = if input.source.starts_with('/') {
            contract::project::SourceKind::Folder
        } else {
            contract::project::SourceKind::Git
        };
        let body = contract::project::CreateInput {
            name: input.name,
            source_kind,
            source_ref: input.source,
            port: input.port,
            group: input.group,
            environment: input.environment,
        };

        let created = behavior::request_agent(&parts.headers, AgentPermission::ProjectWrite, async |scope| {
            usecase::create::create(&mut scope.transaction, body).await
        })
        .await?;

        text(&created)
    }

    #[tool(description = "환경변수 목록. secret 은 마스킹 — 이 채널로는 평문을 볼 수 없다")]
    async fn project_env_list(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(input): Parameters<ProjectId>,
    ) -> Result<String, ErrorData> {
        let listed = behavior::request_agent(&parts.headers, AgentPermission::ProjectRead, async |scope| {
            usecase::env_list::list(&mut scope.transaction, input.project_id).await
        })
        .await?;

        text(&listed)
    }

    #[tool(description = "환경변수 넣기/바꾸기. 반영은 다음 배포부터")]
    async fn project_env_set(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(input): Parameters<EnvSet>,
    ) -> Result<String, ErrorData> {
        let body = contract::project::EnvInput {
            entries: input
                .entries
                .into_iter()
                .map(|entry| contract::project::EnvEntry {
                    key: entry.key,
                    value: entry.value,
                    secret: entry.secret,
                })
                .collect(),
        };
        let count = body.entries.len();

        behavior::request_agent(&parts.headers, AgentPermission::ProjectWrite, async |scope| {
            usecase::env_set::set(&mut scope.transaction, input.project_id, body).await
        })
        .await?;

        Ok(format!("{count}개 저장 — 다음 배포부터 반영"))
    }

    #[tool(description = "컨테이너 켜기")]
    async fn project_start(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(input): Parameters<ProjectId>,
    ) -> Result<String, ErrorData> {
        behavior::request_agent(&parts.headers, AgentPermission::ProjectWrite, async |scope| {
            usecase::start::start(&mut scope.transaction, input.project_id).await
        })
        .await?;

        Ok("켰습니다".into())
    }

    #[tool(description = "컨테이너 끄기 — 포트 예약은 유지")]
    async fn project_stop(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(input): Parameters<ProjectId>,
    ) -> Result<String, ErrorData> {
        behavior::request_agent(&parts.headers, AgentPermission::ProjectWrite, async |scope| {
            usecase::stop::stop(&mut scope.transaction, input.project_id).await
        })
        .await?;

        Ok("껐습니다".into())
    }

    #[tool(description = "컨테이너 튕기기. env 가 배포 뒤에 바뀌었으면 거부(force 로 무시)")]
    async fn project_restart(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(input): Parameters<Restart>,
    ) -> Result<String, ErrorData> {
        behavior::request_agent(&parts.headers, AgentPermission::ProjectWrite, async |scope| {
            usecase::restart::restart(&mut scope.transaction, input.project_id, input.force).await
        })
        .await?;

        Ok("튕겼습니다".into())
    }

    #[tool(description = "지우면 같이 사라지는 것 — 컨테이너·포트·도메인·볼륨·git 링크")]
    async fn project_removal_preview(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(input): Parameters<ProjectId>,
    ) -> Result<String, ErrorData> {
        let previewed = behavior::request_agent(&parts.headers, AgentPermission::ProjectRead, async |scope| {
            usecase::removal::removal(&mut scope.transaction, input.project_id).await
        })
        .await?;

        text(&previewed)
    }
}
