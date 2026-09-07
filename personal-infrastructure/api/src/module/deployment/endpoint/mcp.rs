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
use crate::module::deployment::domain::log;
use crate::module::deployment::domain::repository;
use crate::module::deployment::usecase;

// #
// parameter

#[derive(Deserialize, JsonSchema)]
pub struct ProjectId {
    pub project_id: Uuid,
}

#[derive(Deserialize, JsonSchema)]
pub struct DeploymentId {
    pub deployment_id: Uuid,
}

#[derive(Deserialize, JsonSchema)]
pub struct Promote {
    pub deployment_id: Uuid,
    pub target_project_id: Uuid,
}

#[derive(Deserialize, JsonSchema)]
pub struct Logs {
    pub deployment_id: Uuid,
    /// 이 id 뒤부터 — 폴링할 때 마지막으로 받은 줄의 id
    #[serde(default)]
    pub after: i64,
}

// #
// tool

#[tool_router(router = deployment_tools, vis = "pub")]
impl Agent {
    #[tool(description = "배포 시작 — 감지→빌드→실행. 즉시 반환하고 deploy_logs 로 따라간다")]
    async fn deploy_start(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(input): Parameters<ProjectId>,
    ) -> Result<String, ErrorData> {
        let body = contract::deployment::StartInput {
            project_id: input.project_id,
        };
        let started = behavior::request_agent(&parts.headers, AgentPermission::Deploy, async |scope| {
            usecase::start::start(&mut scope.transaction, body).await
        })
        .await?;

        text(&started)
    }

    #[tool(description = "이전 배포의 이미지를 그대로 다시 띄운다 — 재빌드 없음")]
    async fn deploy_rollback(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(input): Parameters<DeploymentId>,
    ) -> Result<String, ErrorData> {
        let body = contract::deployment::RollbackInput {
            deployment_id: input.deployment_id,
        };
        let rolled = behavior::request_agent(&parts.headers, AgentPermission::Deploy, async |scope| {
            usecase::rollback::rollback(&mut scope.transaction, body).await
        })
        .await?;

        text(&rolled)
    }

    #[tool(description = "다른 환경(같은 group)이 빌드한 이미지를 대상 프로젝트에 올린다")]
    async fn deploy_promote(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(input): Parameters<Promote>,
    ) -> Result<String, ErrorData> {
        let body = contract::deployment::PromoteInput {
            deployment_id: input.deployment_id,
            target_project_id: input.target_project_id,
        };
        let promoted = behavior::request_agent(&parts.headers, AgentPermission::Deploy, async |scope| {
            usecase::promote::promote(&mut scope.transaction, body).await
        })
        .await?;

        text(&promoted)
    }

    #[tool(description = "프로젝트의 배포 이력 — 상태·포트·커밋·오류")]
    async fn deploy_list(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(input): Parameters<ProjectId>,
    ) -> Result<String, ErrorData> {
        let listed = behavior::request_agent(&parts.headers, AgentPermission::ProjectRead, async |scope| {
            usecase::list::list(&mut scope.transaction, input.project_id).await
        })
        .await?;

        text(&listed)
    }

    #[tool(description = "배포 로그. after 로 이어 받는다. 마지막 줄의 id 를 다음 after 로")]
    async fn deploy_logs(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(input): Parameters<Logs>,
    ) -> Result<String, ErrorData> {
        let deployment = behavior::request_agent(&parts.headers, AgentPermission::ProjectRead, async |scope| {
            repository::get_by_id(&mut scope.transaction, input.deployment_id).await
        })
        .await?;

        let lines = log::list_since(database::pool(), input.deployment_id, input.after)
            .await
            .map_err(rmcp::ErrorData::from)?;

        text(&serde_json::json!({
            "status": deployment.status,
            "final": deployment.status.is_final(),
            "lines": lines,
        }))
    }
}
