use std::path::PathBuf;
use std::time::Duration;

use sqlx::PgPool;
use uuid::Uuid;

use crate::behavior::scope::WorkerScope;
use crate::config;
use crate::behavior::worker::with_job;
use crate::infrastructure::compose::client as compose;
use crate::infrastructure::database;
use crate::infrastructure::docker;
use crate::infrastructure::git::client as git;
use crate::infrastructure::notify::client as notify_client;
use crate::module::common::exception::DomainError;
use crate::module::deployment::domain::Deployment;
use crate::module::deployment::domain::Status;
use crate::module::deployment::domain::log;
use crate::module::deployment::domain::repository;
use crate::module::deployment::pipeline::audit;
use crate::module::deployment::pipeline::build;
use crate::module::deployment::pipeline::detect;
use crate::module::deployment::pipeline::start;
use crate::module::edge::domain::reconcile;
use crate::module::git::domain::repository as link_repository;
use crate::module::job::domain::Job;
use crate::module::job::domain::JobKind;
use crate::module::notification::domain::repository as notification_repository;
use crate::module::project::domain::Env;
use crate::module::project::domain::Port;
use crate::module::project::domain::Source;
use crate::module::project::domain::Status as ProjectStatus;
use crate::module::project::domain::repository as project_repository;
use crate::module::webhook::domain::Event;
use crate::module::webhook::domain::dispatch;
use crate::shared::exception::AppError;
use crate::worker;

// #
// run

pub async fn run() {
    worker::repeat("deploy", Duration::from_secs(1), tick).await
}

async fn tick() -> Result<(), AppError> {
    with_job(JobKind::Deploy, deploy).await?;

    Ok(())
}

// #
// job

async fn deploy(scope: &mut WorkerScope, job: Job) -> Result<(), AppError> {
    let pool = database::pool();
    let deployment_id = job.target_id;

    // 파이프라인 상태는 봉투 트랜잭션 밖 풀로 쓴다 — 진행 상황이 커밋 전에 보여야 한다
    let deployment = repository::get_by_id(&mut scope.transaction, deployment_id).await?;
    let project =
        project_repository::get_by_id(&mut *scope.transaction, deployment.project_id).await?;

    let outcome = execute(pool, &deployment, &project).await;

    match outcome {
        Ok(host_port) => {
            repository::update_status(pool, deployment_id, Status::Running).await?;
            repository::supersede(pool, project.id, deployment_id).await?;
            project_repository::update_status(&mut *scope.transaction, project.id, ProjectStatus::Running)
                .await?;

            // 엣지 반영은 커밋 흐름 밖에서 — 실패해도 배포 자체는 성공이다
            match reconcile::run(pool).await {
                Ok(count) => {
                    let _ =
                        log::append(pool, deployment_id, "run", &format!("edge: {count} vhost"))
                            .await;
                }
                Err(error) => {
                    let _ = log::append(
                        pool,
                        deployment_id,
                        "warn",
                        &format!("엣지 반영 실패: {error}"),
                    )
                    .await;
                }
            }

            notify(
                pool,
                &format!(
                    "배포 성공 — {} :{}",
                    project.name.to_str(),
                    host_port.to_u16()
                ),
            )
            .await;
            dispatch::fire(
                pool,
                Event::DeploySucceeded,
                serde_json::json!({
                    "project": project.name.to_str(),
                    "project_id": project.id,
                    "deployment_id": deployment_id,
                    "host_port": host_port.to_u16(),
                    "commit": deployment.commit,
                }),
            )
            .await;
            tracing::info!(%deployment_id, port = host_port.to_u16(), "deployed");

            Ok(())
        }
        Err(error) => {
            let reason = error.to_string();
            let _ = log::append(pool, deployment_id, "error", &reason).await;
            repository::fail(pool, deployment_id, &reason).await?;
            project_repository::update_status(&mut *scope.transaction, project.id, ProjectStatus::Failed)
                .await?;

            notify(
                pool,
                &format!("배포 실패 — {}: {reason}", project.name.to_str()),
            )
            .await;
            dispatch::fire(
                pool,
                Event::DeployFailed,
                serde_json::json!({
                    "project": project.name.to_str(),
                    "project_id": project.id,
                    "deployment_id": deployment_id,
                    "error": reason,
                }),
            )
            .await;

            Err(error)
        }
    }
}

/// 알림 실패가 배포 결과를 바꾸지 않는다 — 삼키고 로그만 남긴다.
async fn notify(pool: &PgPool, text: &str) {
    let Ok(channels) = notification_repository::list_targets(pool).await else {
        return;
    };

    notify_client::send(&channels, text).await;
}

// #
// pipeline

async fn execute(
    pool: &PgPool,
    deployment: &Deployment,
    project: &crate::module::project::domain::Project,
) -> Result<Port, AppError> {
    let id = deployment.id;
    let name = project.name.to_str();

    // env — 봉인을 풀어 평문 쌍으로. 컨테이너와 compose 양쪽이 쓴다
    let env: Vec<(String, String)> = project_repository::list_env(pool, project.id)
        .await?
        .iter()
        .map(Env::to_pair)
        .collect();

    // 이미지 소스(흡수한 컨테이너)는 감지·빌드 없이 — 매 배포마다 새로 pull 한다
    let prebuilt = match (&project.source, deployment.image_ref.clone()) {
        (Source::Image(image), None) => {
            repository::update_status(pool, id, Status::Building).await?;
            log::append(pool, id, "build", &format!("pulling {image}")).await?;
            docker::client::pull(image).await?;
            repository::update_built(pool, id, image).await?;
            project_repository::update_detected(pool, project.id, "image", project.port).await?;

            Some(image.clone())
        }
        (_, prebuilt) => prebuilt,
    };

    // 롤백은 박제된 이미지를 그대로 쓴다 — 감지도 빌드도 건너뛴다
    let (image, container_port) = match prebuilt {
        Some(image) => {
            log::append(pool, id, "run", &format!("reusing image {image}")).await?;

            let port = deployment
                .container_port
                .or(project.port)
                .unwrap_or(Port::from_u16(3000)?);

            // 감지를 건너뛰었으니 stack 은 원본 배포에서 물려받는다
            if let Some(stack) = &deployment.stack {
                project_repository::update_detected(pool, project.id, stack, Some(port)).await?;
            }

            (image, port)
        }
        None => {
            // detect
            repository::update_status(pool, id, Status::Detecting).await?;
            let context = context_of(pool, project, id).await?;

            if let Some(commit) = git::head(&context).await {
                repository::update_commit(pool, id, &commit).await?;
            }

            let detected = detect::run(&context)?;

            log::append(
                pool,
                id,
                "detect",
                &format!("stack={} port={}", detected.stack, detected.port),
            )
            .await?;
            repository::update_detected(pool, id, detected.stack).await?;

            // compose 는 파일을 고치지 않고 그대로 올린다 — 빌드·실행을 compose 가 진다
            if let detect::Dockerfile::Compose(file) = &detected.dockerfile {
                repository::update_status(pool, id, Status::Building).await?;

                project_repository::update_detected(pool, project.id, detected.stack, None).await?;
                let namespace = format!("pi-{name}");
                let env_file = write_env_file(name, &env).await?;
                compose::up(file, &namespace, env_file.as_deref(), async |line| {
                    let _ = log::append(pool, id, "build", &line).await;
                })
                .await?;

                let published = compose::published_port(&namespace).await?.ok_or(
                    DomainError::InvalidTransition {
                        target: "Compose",
                        actual: "publish 된 포트가 없습니다".to_owned(),
                    },
                )?;
                let host_port = Port::from_u16(published)?;

                repository::update_built(pool, id, &format!("compose:{namespace}")).await?;
                repository::update_started(pool, id, &namespace, host_port, None).await?;

                return Ok(host_port);
            }

            // build
            repository::update_status(pool, id, Status::Building).await?;
            let image = build::run(pool, id, name, &context, &detected.dockerfile).await?;
            repository::update_built(pool, id, &image).await?;

            // 포트: 사용자 지정 > Dockerfile/스택 감지 > 이미지(베이스 포함)의 EXPOSE > 3000
            let container_port = match project.port {
                Some(port) => port,
                None if detected.port_known => Port::from_u16(detected.port)?,
                None => {
                    let exposed = docker::client::image_ports(&image).await.into_iter().next();
                    log::append(pool, id, "detect", &format!("image exposes {exposed:?}")).await?;
                    Port::from_u16(exposed.unwrap_or(detected.port))?
                }
            };
            project_repository::update_detected(pool, project.id, detected.stack, Some(container_port)).await?;

            (image, container_port)
        }
    };

    // run
    repository::update_status(pool, id, Status::Starting).await?;

    let mut connection = pool.acquire().await?;
    let host_port =
        project_repository::claim_port(&mut connection, Some(project.id), "deploy").await?;

    let container_id = start::run(pool, id, project, &image, host_port, container_port, env).await?;
    repository::update_started(pool, id, &container_id, host_port, Some(container_port)).await?;

    // 포트 감사는 배포 완료를 기다리게 하지 않는다 — 경고만 남긴다
    tokio::spawn(audit::run(database::pool(), id, project.container(), container_port));

    Ok(host_port)
}

/// compose 는 `--env-file` 로 받는다. env 가 없으면 파일도 없다.
async fn write_env_file(name: &str, env: &[(String, String)]) -> Result<Option<PathBuf>, AppError> {
    if env.is_empty() {
        return Ok(None);
    }

    let dir = config::get().work_dir.join("env");
    tokio::fs::create_dir_all(&dir).await?;

    let path = dir.join(format!("{name}.env"));
    let body: String = env
        .iter()
        .map(|(key, value)| format!("{key}={value}\n"))
        .collect();

    tokio::fs::write(&path, body).await?;

    Ok(Some(path))
}

/// 폴더 소스는 그 경로를, git 소스는 clone/fetch 한 작업 폴더를 쓴다.
async fn context_of(
    pool: &PgPool,
    project: &crate::module::project::domain::Project,
    deployment_id: Uuid,
) -> Result<PathBuf, AppError> {
    match &project.source {
        Source::Folder(path) => Ok(PathBuf::from(path)),
        Source::Image(_) => unreachable!("image source never builds"),
        Source::Git(repository) => {
            let mut connection = pool.acquire().await?;
            let branch = link_repository::find(&mut connection, project.id)
                .await?
                .map(|link| link.branch)
                .unwrap_or_else(|| "main".to_owned());

            log::append(
                pool,
                deployment_id,
                "detect",
                &format!("fetching {repository} ({branch})"),
            )
            .await?;

            let synced = git::sync(repository, &branch, &project.id.simple().to_string()).await?;

            Ok(synced)
        }
    }
}
