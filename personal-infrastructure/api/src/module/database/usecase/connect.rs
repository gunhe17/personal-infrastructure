use sqlx::PgConnection;
use uuid::Uuid;

use contract::database::Engine;

use crate::module::common::secret::Secret;
use crate::module::database::domain::engine;
use crate::module::database::domain::repository;
use crate::module::project::domain::Env;
use crate::module::project::domain::Key;
use crate::module::project::domain::repository as project_repository;
use crate::shared::exception::AppError;

pub use contract::database::ConnectInput as Input;

// #
// usecase

/// DB 를 프로젝트에 물린다 — 접속 문자열이 secret env 로 들어가고, 호출자에게는 돌아가지 않는다.
/// 반영은 다음 배포부터.
pub async fn connect(connection: &mut PgConnection, id: Uuid, input: Input) -> Result<String, AppError> {
    let instance = repository::get_by_id(connection, id).await?;
    project_repository::get_by_id(&mut *connection, input.project_id).await?;

    let spec = engine::spec(
        instance.engine,
        &instance.version,
        &instance.username,
        instance.password.to_str(),
        &instance.database,
    );
    let url = format!(
        "{}://{}:{}@127.0.0.1:{}/{}",
        spec.url_scheme,
        instance.username,
        instance.password.to_str(),
        instance.host_port,
        instance.database
    );
    let key = Key::from_str(&input.key.unwrap_or_else(|| {
        if instance.engine == Engine::Minio { "S3_URL" } else { "DATABASE_URL" }.to_owned()
    }))?;

    project_repository::upsert_env(
        connection,
        input.project_id,
        &[Env {
            key: key.clone(),
            value: Secret::from_str(&url),
            secret: true,
        }],
    )
    .await?;

    Ok(key.to_str().to_owned())
}
