use sqlx::PgConnection;

use crate::infrastructure::docker;
use crate::infrastructure::host::client as host;
use crate::module::mail::CONTAINER;
use crate::module::mail::PORTS;
use crate::module::mail::SETTING_DOMAIN;
use crate::module::setting::domain::repository as setting_repository;
use crate::shared::exception::AppError;

pub use contract::mail::Status as Output;

// #
// usecase

pub async fn status(connection: &mut PgConnection) -> Result<Output, AppError> {
    let domain = setting_repository::get(connection, SETTING_DOMAIN)
        .await?
        .and_then(|value| value.as_str().map(str::to_owned));

    let listeners = host::scan_listeners().await;
    let listening: Vec<u16> = PORTS
        .into_iter()
        .filter(|port| listeners.iter().any(|l| l.port == *port))
        .collect();

    let admin_url = sqlx::query!("select port from host_port_claim where reason = 'mail:admin'")
        .fetch_optional(connection)
        .await?
        .map(|row| format!("http://127.0.0.1:{}", row.port));

    Ok(Output {
        domain,
        running: docker::client::is_running(CONTAINER).await,
        admin_url,
        listening,
        firewall_hint: None,
    })
}
