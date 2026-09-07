use crate::infrastructure::process::ProcessError;

// #
// exception

#[derive(thiserror::Error, Debug)]
pub enum EdgeError {
    #[error("엣지 설정 쓰기 실패 (원인: {0})")]
    Io(#[from] std::io::Error),

    #[error(transparent)]
    Process(#[from] ProcessError),
}
