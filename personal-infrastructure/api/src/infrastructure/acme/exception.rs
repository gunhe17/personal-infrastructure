// #
// exception

#[derive(thiserror::Error, Debug)]
pub enum AcmeError {
    #[error("인증서 발급 실패 (호스트: {host}, 원인: {reason})")]
    Issue { host: String, reason: String },

    #[error(transparent)]
    Io(#[from] std::io::Error),
}
