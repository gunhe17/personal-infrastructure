use sqlx::PgConnection;

use crate::module::token::domain::Name;
use crate::module::token::domain::Secret;
use crate::module::token::domain::Token;
use crate::module::token::domain::repository;
use crate::shared::exception::AppError;

pub use contract::token::CreateInput as Input;
pub use contract::token::Created as Output;

// #
// usecase

pub async fn create(connection: &mut PgConnection, input: Input) -> Result<Output, AppError> {
    // build
    let token = Token::new(Name::from_str(&input.name)?, input.scopes);
    let secret = Secret::generate();

    // persist
    repository::add(connection, &token, &secret.hash()).await?;

    // return
    let created = Output {
        token: token.to_output(),
        secret: secret.to_str().to_owned(),
    };

    Ok(created)
}
