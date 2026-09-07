use chrono::DateTime;
use chrono::Utc;
use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

// #
// value

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TlsMode {
    /// 인증서 없이 :80 만
    None,
    /// Let's Encrypt HTTP-01
    Acme,
    /// 손으로 올린 인증서
    Manual,
    /// 로컬 개발용 자체 서명
    SelfSigned,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Pending,
    Routed,
    Failed,
}

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct AttachInput {
    pub project_id: Uuid,
    pub host: String,
    #[serde(default)]
    pub path_prefix: Option<String>,
    pub tls_mode: TlsMode,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadCertInput {
    pub host: String,
    pub cert_pem: String,
    pub key_pem: String,
}

// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct Output {
    pub id: Uuid,
    pub project_id: Uuid,
    pub host: String,
    pub path_prefix: String,
    pub tls_mode: TlsMode,
    pub status: Status,
    pub certificate_not_after: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CertificateOutput {
    pub id: Uuid,
    pub host: String,
    pub issuer: String,
    pub not_after: DateTime<Utc>,
}
