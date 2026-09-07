use crate::infrastructure::edge::client as edge;
use crate::infrastructure::edge::render;
use crate::shared::exception::AppError;

pub use contract::edge::VhostOutput as Output;

// #
// usecase

/// 엣지가 실제로 들고 있는 파일 — 우리가 쓴 것만. DB 가 아니라 디스크를 읽는다(진단용).
pub async fn vhosts() -> Result<Vec<Output>, AppError> {
    let mut listed = Vec::new();
    let Ok(mut entries) = tokio::fs::read_dir(edge::config_dir()).await else {
        return Ok(listed);
    };

    while let Ok(Some(entry)) = entries.next_entry().await {
        let Ok(body) = tokio::fs::read_to_string(entry.path()).await else {
            continue;
        };

        if !body.starts_with(render::MARKER) {
            continue;
        }

        listed.push(Output {
            host: entry.path().file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default(),
            body,
        });
    }

    listed.sort_by(|a, b| a.host.cmp(&b.host));

    Ok(listed)
}
