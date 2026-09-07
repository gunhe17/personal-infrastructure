use sqlx::PgConnection;

use crate::infrastructure::docker;
use crate::module::credential::domain::repository as credential_repository;
use crate::module::tunnel::CONTAINER;
use crate::module::tunnel::CREDENTIAL;
use crate::shared::exception::AppError;

pub use contract::tunnel::Status as Output;

// #
// usecase

pub async fn status(connection: &mut PgConnection) -> Result<Output, AppError> {
    Ok(Output {
        running: docker::client::is_running(CONTAINER).await,
        configured: credential_repository::find_by_name(connection, CREDENTIAL).await?.is_some(),
    })
}
