use serde::Deserialize;
use serde::Serialize;

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct SetupInput {
    /// 메일 도메인 (example.com)
    pub domain: String,
    /// ufw/firewalld 가 있으면 25·465·587·993 을 연다. 없으면 명령만 돌려준다
    #[serde(default)]
    pub open_firewall: bool,
}

// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct Status {
    pub domain: Option<String>,
    pub running: bool,
    /// 관리 UI — 루프백. 첫 비밀번호는 `docker logs pi-mail`
    pub admin_url: Option<String>,
    /// 실제로 듣고 있는 메일 포트
    pub listening: Vec<u16>,
    /// 방화벽을 못 열었을 때 손으로 돌릴 명령
    pub firewall_hint: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DnsRecord {
    pub name: String,
    pub kind: String,
    pub value: String,
    pub note: String,
}
