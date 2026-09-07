use crate::infrastructure::docker;
use crate::module::migration::domain::foreign;
use crate::shared::exception::AppError;

pub use contract::migration::Foreign as Output;

// #
// usecase

/// 우리 라벨이 없는 컨테이너 전부 — 흡수 후보 목록.
pub async fn scan() -> Result<Vec<Output>, AppError> {
    let mut listed = Vec::new();

    for name in docker::client::list_foreign().await? {
        // 하나가 사라졌다고 목록 전체를 실패시키지 않는다
        if let Ok(inspected) = docker::client::inspect(&name).await {
            listed.push(foreign::from_inspect(&name, &inspected));
        }
    }

    Ok(listed)
}
