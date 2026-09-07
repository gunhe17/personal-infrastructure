use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

// #
// value

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChannelKind {
    Slack,
    Webhook,
}

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateChannelInput {
    pub name: String,
    pub kind: ChannelKind,
    pub target: String,
}

// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct ChannelOutput {
    pub id: Uuid,
    pub name: String,
    pub kind: ChannelKind,
    pub target: String,
}
