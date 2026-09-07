use anyhow::Result;
use axum::Router;
use axum::routing::delete;
use axum::routing::get;
use axum::routing::post;
use axum::routing::put;

use tokio::net::TcpListener;
use tower_http::services::ServeDir;
use tower_http::services::ServeFile;
use tower_http::trace::TraceLayer;

use api::bootstrap;
use api::config;
use api::mcp;
use api::module::analytics;
use api::module::audit;
use api::module::backup;
use api::module::credential;
use api::module::database;
use api::module::deployment;
use api::module::domain_name;
use api::module::edge;
use api::module::git;
use api::module::job;
use api::module::mail;
use api::module::migration;
use api::module::monitoring;
use api::module::notification;
use api::module::project;
use api::module::setting;
use api::module::system;
use api::module::token;
use api::module::tunnel;
use api::module::volume;
use api::module::webhook;

// #
// router

fn router() -> Router {
    Router::new()
        // system
        .route("/health", get(system::endpoint::get_health))
        .route("/status", get(system::endpoint::get_status))
        .route("/doctor", get(system::endpoint::get_doctor))
        .route("/system/ports", get(system::endpoint::get_ports))
        .route("/system/listeners", get(system::endpoint::get_listeners))
        .route("/issues", get(monitoring::endpoint::get_issues))
        .route("/audit", get(audit::endpoint::get_list))
        .route("/analytics", get(analytics::endpoint::get_summary))
        .route("/jobs", get(job::endpoint::get_list))
        .route("/jobs/run/{name}", post(job::endpoint::post_run))
        .route("/analytics/usage", get(analytics::endpoint::get_usage))
        // tunnel · migration
        .route(
            "/tunnel",
            get(tunnel::endpoint::get_status).post(tunnel::endpoint::post_up),
        )
        .route("/tunnel/down", post(tunnel::endpoint::post_down))
        .route("/migration/scan", get(migration::endpoint::get_scan))
        .route("/migration/adopt", post(migration::endpoint::post_adopt))
        // mail
        .route(
            "/mail",
            get(mail::endpoint::get_status)
                .post(mail::endpoint::post_setup)
                .delete(mail::endpoint::delete_remove),
        )
        .route("/mail/dns", get(mail::endpoint::get_dns))
        .route(
            "/settings",
            get(setting::endpoint::get_list).put(setting::endpoint::put_set),
        )
        // token
        .route(
            "/tokens",
            get(token::endpoint::get_list).post(token::endpoint::post_create),
        )
        .route("/tokens/{id}", delete(token::endpoint::delete_revoke))
        // project
        .route(
            "/projects",
            get(project::endpoint::get_list).post(project::endpoint::post_create),
        )
        .route(
            "/projects/{id}",
            get(project::endpoint::get_detail).delete(project::endpoint::delete_remove),
        )
        .route("/projects/{id}/removal", get(project::endpoint::get_removal))
        .route("/projects/{id}/start", post(project::endpoint::post_start))
        .route("/projects/{id}/stop", post(project::endpoint::post_stop))
        .route("/projects/{id}/restart", post(project::endpoint::post_restart))
        .route("/projects/{id}/limits", put(project::endpoint::put_limits))
        .route(
            "/projects/{id}/env",
            get(project::endpoint::get_env).put(project::endpoint::put_env),
        )
        .route("/projects/{id}/env/reveal", get(project::endpoint::get_env_reveal))
        .route("/projects/{id}/env/{key}", delete(project::endpoint::delete_env))
        // deployment
        .route(
            "/deployments",
            get(deployment::endpoint::get_list).post(deployment::endpoint::post_start),
        )
        .route(
            "/deployments/rollback",
            post(deployment::endpoint::post_rollback),
        )
        .route(
            "/deployments/promote",
            post(deployment::endpoint::post_promote),
        )
        .route("/deployments/{id}", get(deployment::endpoint::get_detail))
        .route("/deployments/{id}/cancel", post(deployment::endpoint::post_cancel))
        .route(
            "/deployments/{id}/logs",
            get(deployment::endpoint::get_logs),
        )
        // domain · certificate
        .route(
            "/domains",
            get(domain_name::endpoint::get_list).post(domain_name::endpoint::post_attach),
        )
        .route(
            "/domains/{id}",
            delete(domain_name::endpoint::delete_detach),
        )
        .route("/domains/{id}/ssl", post(domain_name::endpoint::post_ssl))
        .route(
            "/certificates",
            get(domain_name::endpoint::get_certificates)
                .post(domain_name::endpoint::post_certificate),
        )
        // edge
        .route(
            "/edge/rules",
            get(edge::endpoint::get_rules).post(edge::endpoint::post_rule),
        )
        .route("/edge/rules/{id}", delete(edge::endpoint::delete_rule))
        .route("/edge/vhosts", get(edge::endpoint::get_vhosts))
        .route("/edge/reload", post(edge::endpoint::post_reload))
        // hooks (outbound)
        .route(
            "/hooks",
            get(webhook::endpoint::get_list).post(webhook::endpoint::post_create),
        )
        .route("/hooks/{id}", delete(webhook::endpoint::delete_remove))
        .route("/hooks/{id}/deliveries", get(webhook::endpoint::get_deliveries))
        // git · webhook
        .route("/git/links", post(git::endpoint::post_link))
        .route(
            "/git/links/{project_id}",
            delete(git::endpoint::delete_unlink),
        )
        .route("/webhooks/git/{project_id}", post(git::endpoint::post_push))
        // database
        .route(
            "/databases",
            get(database::endpoint::get_list).post(database::endpoint::post_create),
        )
        .route("/databases/engines", get(database::endpoint::get_engines))
        .route("/databases/{id}", delete(database::endpoint::delete_remove))
        .route("/databases/{id}/connect", post(database::endpoint::post_connect))
        .route(
            "/databases/{id}/connection",
            get(database::endpoint::get_connection),
        )
        // backup
        .route(
            "/backups",
            get(backup::endpoint::get_list).post(backup::endpoint::post_run),
        )
        .route(
            "/backups/destinations",
            get(backup::endpoint::get_destinations).post(backup::endpoint::post_destination),
        )
        .route("/backups/schedules", post(backup::endpoint::post_schedule))
        .route("/backups/restore", post(backup::endpoint::post_restore))
        // credential
        .route(
            "/credentials",
            get(credential::endpoint::get_list).post(credential::endpoint::post_create),
        )
        .route(
            "/credentials/{id}",
            delete(credential::endpoint::delete_remove),
        )
        .route(
            "/credentials/{id}/reveal",
            get(credential::endpoint::get_reveal),
        )
        // volume
        .route(
            "/volumes",
            get(volume::endpoint::get_list).post(volume::endpoint::post_create),
        )
        .route("/volumes/{id}", delete(volume::endpoint::delete_remove))
        // notification
        .route(
            "/notifications/channels",
            get(notification::endpoint::get_list).post(notification::endpoint::post_create),
        )
        .route(
            "/notifications/channels/{id}",
            delete(notification::endpoint::delete_remove),
        )
        // mcp — 툴 라우터도 여기서 합친다 [INV-14]
        .nest_service(
            "/mcp",
            mcp::service(
                mcp::Agent::project_tools()
                    + mcp::Agent::deployment_tools()
                    + mcp::Agent::domain_tools()
                    + mcp::Agent::system_tools(),
            ),
        )
        .layer(TraceLayer::new_for_http())
}

/// 대시보드 — dist/ 를 /ui 에서. API 와 경로 모양이 겹치므로(`/projects/{id}`) 접두로 가른다.
/// /ui 아래 모르는 경로는 index.html(SPA 라우팅), / 는 /ui 로.
fn with_wui(router: Router) -> Router {
    let Some(dir) = &config::get().wui_dir else {
        return router;
    };

    tracing::info!(dir = %dir.display(), "serving wui at /ui");

    router
        .route("/", get(|| async { axum::response::Redirect::permanent("/ui/") }))
        .nest_service("/ui", ServeDir::new(dir).fallback(ServeFile::new(dir.join("index.html"))))
}

// #
// run

#[tokio::main]
async fn main() -> Result<()> {
    bootstrap::init("server").await?;

    api::behavior::request(async |scope| {
        token::usecase::bootstrap::ensure(&mut scope.transaction).await
    })
    .await?;

    // 엣지가 유일한 공개 창구 — API 자신도 루프백에만 뜬다
    let listener = TcpListener::bind(("127.0.0.1", config::get().port)).await?;
    tracing::info!(port = config::get().port, "listening");

    axum::serve(listener, with_wui(router()))
        .with_graceful_shutdown(bootstrap::shutdown())
        .await?;

    Ok(())
}
