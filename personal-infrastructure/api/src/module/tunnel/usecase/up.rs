use sqlx::PgConnection;

use crate::config;
use crate::infrastructure::docker;
use crate::infrastructure::docker::client::Run;
use crate::module::common::exception::DomainError;
use crate::module::common::secret::Secret;
use crate::module::credential::domain::repository as credential_repository;
use crate::module::tunnel::CONTAINER;
use crate::module::tunnel::CREDENTIAL;
use crate::shared::exception::AppError;

pub use contract::tunnel::Status as Output;

// #
// usecase

/// cloudflared 를 호스트 네트워크로 띄운다 — 엣지의 :80/:443 이 터널 뒤로 나간다.
/// 토큰은 credential 에 봉인해 두고, 다음부터는 안 넘겨도 된다.
// ponytail: 첫 pull 이 요청을 붙잡는다 — 자주 하는 일이 아니라 job 으로 빼지 않았다
pub async fn up(connection: &mut PgConnection, token: Option<String>) -> Result<Output, AppError> {
    let secret = match token {
        Some(token) => {
            let secret = Secret::from_str(token.trim());
            credential_repository::upsert(connection, CREDENTIAL, "tunnel", &secret).await?;

            secret
        }
        None => credential_repository::find_by_name(connection, CREDENTIAL)
            .await?
            .ok_or(DomainError::InvalidTransition {
                target: "Tunnel",
                actual: "토큰이 없습니다 — `tunnel up --token`".to_owned(),
            })?,
    };

    docker::client::remove(CONTAINER).await;
    // cloudflared 는 바깥으로만 붙는다. 리눅스는 호스트 네트워크로 localhost:80 을, Mac 은 host.docker.internal:80 을 가리킨다
    docker::client::run(Run {
        name: CONTAINER.to_owned(),
        image: "cloudflare/cloudflared:latest".to_owned(),
        network_host: config::Platform::current() == config::Platform::Linux,
        args: ["tunnel", "--no-autoupdate", "run", "--token", secret.to_str()]
            .map(String::from)
            .to_vec(),
        ..Default::default()
    })
    .await?;

    Ok(Output {
        running: true,
        configured: true,
    })
}
