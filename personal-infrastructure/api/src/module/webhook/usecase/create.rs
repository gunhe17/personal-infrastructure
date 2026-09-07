use chrono::Utc;
use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::common::exception::DomainError;
use crate::module::common::secret::Secret;
use crate::module::webhook::domain::repository;
use crate::module::webhook::domain::repository::Hook;
use crate::shared::exception::AppError;

pub use contract::webhook::CreateInput as Input;
pub use contract::webhook::Output;

// #
// usecase

pub async fn create(connection: &mut PgConnection, input: Input) -> Result<Output, AppError> {
    // validate — http(s) 만
    if !input.url.starts_with("http://") && !input.url.starts_with("https://") {
        return Err(DomainError::InvalidFormat { target: "WebhookUrl" })?;
    }

    // build
    let hook = Hook {
        id: Uuid::new_v4(),
        event: input.event,
        url: input.url,
        secret: input.secret.as_deref().map(Secret::from_str),
        created_at: Utc::now(),
    };

    // persist
    repository::add(connection, &hook).await?;

    Ok(hook.to_output())
}
