use serde::Deserialize;
use serde::Serialize;

// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct PortMap {
    pub host: u16,
    pub container: u16,
}

/// 우리 라벨이 없는 컨테이너 — 흡수 후보.
#[derive(Debug, Serialize, Deserialize)]
pub struct Foreign {
    pub name: String,
    pub image: String,
    pub state: String,
    pub ports: Vec<PortMap>,
    pub mounts: Vec<String>,
    pub env: Vec<String>,
}

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct AdoptInput {
    /// 컨테이너 이름
    pub container: String,
    /// 프로젝트 이름. 비우면 컨테이너 이름
    #[serde(default)]
    pub name: Option<String>,
}
