use crate::infrastructure::docker;
use crate::module::tunnel::CONTAINER;

// #
// usecase

/// 컨테이너만 내린다 — 토큰은 남아서 `up` 이 다시 쓴다.
pub async fn down() {
    docker::client::remove(CONTAINER).await;
}
