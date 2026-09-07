use uuid::Uuid;

use crate::behavior::scope::TokenScope;
use crate::module::credential::domain::repository;
use crate::shared::exception::AppError;

pub use contract::credential::Revealed as Output;

// #
// usecase

/// 평문. `TokenScope` 를 요구하므로 MCP 봉투로는 도달할 수 없다.
pub async fn reveal(scope: &mut TokenScope, id: Uuid) -> Result<Output, AppError> {
    let secret = repository::get_secret(&mut scope.transaction, id).await?;

    Ok(Output {
        secret: secret.to_str().to_owned(),
    })
}
