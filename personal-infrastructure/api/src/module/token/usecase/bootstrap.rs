use sqlx::PgConnection;

use crate::config;

use crate::module::token::domain::Name;
use crate::module::token::domain::Scope;
use crate::module::token::domain::Secret;
use crate::module::token::domain::Token;
use crate::module::token::domain::repository;
use crate::shared::exception::AppError;

// #
// usecase

/// 토큰이 하나도 없으면 전권 토큰을 발급한다. 평문은 이때 한 번만 로그에 남는다 —
/// 없으면 첫 토큰을 만들 방법이 없다(토큰 발급에도 토큰이 필요하므로).
pub async fn ensure(connection: &mut PgConnection) -> Result<(), AppError> {
    // find
    let existing = repository::list_all(connection).await?;

    if !existing.is_empty() {
        return Ok(());
    }

    // build
    let token = Token::new(Name::from_str("bootstrap")?, Scope::ALL.to_vec());
    let secret = Secret::generate();

    // persist
    repository::add(connection, &token, &secret.hash()).await?;

    // `pi install` 이 읽어 가고 지운다. 로그에도 한 번 — 파일을 못 읽는 경우의 마지막 길
    let path = config::get().work_dir.join("bootstrap.token");
    tokio::fs::write(&path, secret.to_str()).await?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        tokio::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600)).await?;
    }

    tracing::warn!(
        secret = secret.to_str(),
        path = %path.display(),
        "최초 토큰을 발급했습니다. 지금 저장하세요 — 다시 표시되지 않습니다"
    );

    Ok(())
}
