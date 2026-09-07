use sqlx::PgConnection;

use crate::module::project::domain::Name;
use crate::module::project::domain::Port;
use crate::module::project::domain::Project;
use crate::module::project::domain::Source;
use crate::module::project::domain::repository;
use crate::shared::exception::AppError;

pub use contract::project::CreateInput as Input;
pub use contract::project::Output;

// #
// usecase

pub async fn create(connection: &mut PgConnection, input: Input) -> Result<Output, AppError> {
    // build
    let project = Project::new(
        Name::from_str(&input.name)?,
        input.group.as_deref().map(Name::from_str).transpose()?,
        input.environment.as_deref().map(Name::from_str).transpose()?,
        Source::from_parts(input.source_kind, &input.source_ref)?,
        input.port.map(Port::from_u16).transpose()?,
    );

    // persist
    repository::add(connection, &project).await?;

    // return
    let created = project.to_output();

    Ok(created)
}
