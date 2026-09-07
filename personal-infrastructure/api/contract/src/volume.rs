use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInput {
    pub name: String,
    pub mount_path: String,
    #[serde(default)]
    pub project_id: Option<Uuid>,
}

// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct Output {
    pub id: Uuid,
    pub project_id: Option<Uuid>,
    pub name: String,
    pub mount_path: String,
}
