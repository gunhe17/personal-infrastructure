use serde::Serialize;
use serde::de::DeserializeOwned;

// #
// text

/// serde 이름(`snake_case`)이 enum 의 유일한 문자열 표현이다 —
/// DB 컬럼·CLI 인자·표 출력이 전부 이 하나를 탄다. 손으로 짠 match 쌍을 두지 않는다.
pub fn of<T: Serialize>(value: &T) -> String {
    serde_json::to_value(value)
        .ok()
        .and_then(|value| value.as_str().map(str::to_owned))
        .unwrap_or_default()
}

pub fn parse<T: DeserializeOwned>(value: &str) -> Option<T> {
    serde_json::from_value(serde_json::Value::String(value.to_owned())).ok()
}
