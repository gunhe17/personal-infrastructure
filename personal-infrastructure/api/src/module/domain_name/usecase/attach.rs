use chrono::Utc;
use sqlx::PgConnection;
use uuid::Uuid;

use contract::domain_name::Status;

use crate::module::domain_name::domain::Host;
use crate::module::domain_name::domain::repository;
use crate::module::domain_name::domain::repository::Attached;
use crate::module::project::domain::repository as project_repository;
use crate::shared::exception::AppError;

pub use contract::domain_name::AttachInput as Input;
pub use contract::domain_name::Output;

// #
// usecase

pub async fn attach(connection: &mut PgConnection, input: Input) -> Result<Output, AppError> {
    // find
    project_repository::get_by_id(&mut *connection, input.project_id).await?;

    // build
    let host = Host::from_str(&input.host)?;
    let attached = Attached {
        id: Uuid::new_v4(),
        project_id: input.project_id,
        host: host.to_str().to_owned(),
        path_prefix: input.path_prefix.unwrap_or_else(|| "/".to_owned()),
        tls_mode: input.tls_mode,
        status: Status::Pending,
        upstream_port: None,
        created_at: Utc::now(),
    };

    // persist
    repository::add(connection, &attached).await?;

    // return — 엣지 반영과 인증서 발급은 워커가 한다. 요청은 여기서 끝난다
    Ok(attached.to_output())
}
