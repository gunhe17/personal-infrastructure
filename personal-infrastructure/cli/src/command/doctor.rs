use crate::client;
use crate::output;

// #
// run

/// 박스 점검. 하나라도 실패하면 종료 코드 1.
pub async fn run() -> anyhow::Result<()> {
    let checks: Vec<contract::system::Check> = client::get("/doctor").await?;

    if output::is_json() {
        return output::json(&checks);
    }

    let rows = checks
        .iter()
        .map(|check| {
            vec![
                if check.ok { "ok" } else { "FAIL" }.to_owned(),
                check.name.clone(),
                check.detail.clone(),
            ]
        })
        .collect::<Vec<_>>();

    output::table(&["", "CHECK", "DETAIL"], &rows);

    if checks.iter().any(|check| !check.ok) {
        std::process::exit(1);
    }

    Ok(())
}
