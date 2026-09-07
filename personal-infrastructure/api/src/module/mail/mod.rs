pub mod endpoint;
pub mod usecase;

pub const CONTAINER: &str = "pi-mail";
pub const VOLUME: &str = "pi-mail";
pub const IMAGE: &str = "stalwartlabs/mail-server:latest";
pub const SETTING_DOMAIN: &str = "mail_domain";
/// 엣지를 못 타는 포트 — 메일만 0.0.0.0 에 연다
pub const PORTS: [u16; 4] = [25, 465, 587, 993];
