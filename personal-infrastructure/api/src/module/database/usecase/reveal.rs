use uuid::Uuid;

use crate::behavior::scope::TokenScope;

use crate::module::database::domain::engine;
use crate::module::database::domain::repository;
use crate::shared::exception::AppError;

pub use contract::database::Connection as Output;

// #
// usecase

/// 접속 문자열에는 비밀번호가 들어간다 — `TokenScope` 를 요구하므로 MCP 봉투로는 못 부른다.
pub async fn reveal(scope: &mut TokenScope, id: Uuid) -> Result<Output, AppError> {
    // find
    let instance = repository::get_by_id(&mut scope.transaction, id).await?;

    let spec = engine::spec(
        instance.engine,
        &instance.version,
        &instance.username,
        instance.password.to_str(),
        &instance.database,
    );

    // return
    let revealed = Output {
        url: format!(
            "{}://{}:{}@127.0.0.1:{}/{}",
            spec.url_scheme,
            instance.username,
            instance.password.to_str(),
            instance.host_port,
            instance.database
        ),
    };

    Ok(revealed)
}
