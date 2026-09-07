use anyhow::Result;
use tokio::task::JoinSet;

use api::bootstrap;
use api::worker;

// #
// runner

fn runners() -> JoinSet<()> {
    let mut set = JoinSet::new();

    set.spawn(worker::deploy::run());
    set.spawn(worker::database::run());
    set.spawn(worker::ssl_renew::run());
    set.spawn(worker::backup::run());
    set.spawn(worker::monitor::run());
    set.spawn(worker::gc::run());

    set
}

// #
// run

#[tokio::main]
async fn main() -> Result<()> {
    bootstrap::init("worker").await?;

    let mut set = runners();

    bootstrap::shutdown().await;
    set.shutdown().await;

    Ok(())
}
