use clap::Subcommand;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// 한눈에 보는 상태
    Show,
    /// 지금 열려 있는 문제
    Issues,
    /// 포트 예약대장 — 관측과 나란히
    Ports,
    /// 호스트 전체 리스너 스캔
    Listeners,
    /// 감사 로그
    Audit,
    /// 요청 통계 — 지난 24시간 상태코드 분포와 상위 경로
    Requests,
    /// 자원 사용량 — 컨테이너별 평균 CPU·최대 메모리 (24h)
    Usage,
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::Show => {
            let status: contract::system::Status = client::get("/status").await?;

            if output::is_json() {
                return output::json(&status);
            }

            output::record(&[
                ("version", status.version.clone()),
                ("projects", status.projects.to_string()),
                ("running", status.running.to_string()),
                ("deploys/24h", status.deployments_today.to_string()),
                ("open issues", status.open_issues.to_string()),
                (
                    "edge",
                    if status.edge_running {
                        "up".into()
                    } else {
                        "down".to_string()
                    },
                ),
            ]);

            Ok(())
        }
        Command::Issues => {
            let listed: Vec<contract::system::Issue> = client::get("/issues").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            if listed.is_empty() {
                output::info("열린 문제가 없습니다");

                return Ok(());
            }

            let rows = listed
                .iter()
                .map(|issue| {
                    vec![
                        issue.severity.clone(),
                        issue.scope.clone(),
                        issue.subject.clone(),
                        issue.message.clone(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["SEVERITY", "SCOPE", "SUBJECT", "MESSAGE"], &rows);

            Ok(())
        }
        Command::Ports => {
            let listed: Vec<contract::system::PortClaim> = client::get("/system/ports").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|claim| {
                    vec![
                        claim.port.to_string(),
                        claim.reason.clone(),
                        if claim.listening { "listening" } else { "idle" }.to_owned(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["PORT", "CLAIM", "OBSERVED"], &rows);

            Ok(())
        }
        Command::Listeners => {
            let listed: Vec<contract::system::Listener> = client::get("/system/listeners").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|listener| {
                    vec![
                        listener.port.to_string(),
                        listener.process.clone(),
                        listener.address.clone(),
                        if listener.public {
                            "public"
                        } else {
                            "loopback"
                        }
                        .to_owned(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["PORT", "PROCESS", "ADDRESS", "EXPOSURE"], &rows);

            Ok(())
        }
        Command::Usage => {
            let listed: Vec<contract::analytics::UsageRow> = client::get("/analytics/usage").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|row| {
                    vec![
                        row.container.clone(),
                        format!("{:.1}%", row.cpu_avg),
                        format!("{} MB", row.mem_max_bytes / 1024 / 1024),
                        row.samples.to_string(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["CONTAINER", "CPU AVG", "MEM MAX", "SAMPLES"], &rows);

            Ok(())
        }
        Command::Requests => {
            let summary: contract::analytics::Summary = client::get("/analytics").await?;

            if output::is_json() {
                return output::json(&summary);
            }

            output::record(&[
                ("since", summary.since.format("%m-%d %H:%M").to_string()),
                ("total", summary.total.to_string()),
                (
                    "statuses",
                    summary
                        .statuses
                        .iter()
                        .map(|s| format!("{}×{}", s.status, s.count))
                        .collect::<Vec<_>>()
                        .join("  "),
                ),
            ]);

            let rows = summary
                .top_paths
                .iter()
                .map(|p| vec![p.count.to_string(), p.host.clone(), p.path.clone()])
                .collect::<Vec<_>>();

            output::table(&["COUNT", "HOST", "PATH"], &rows);

            Ok(())
        }
        Command::Audit => {
            let listed: Vec<contract::system::AuditEntry> = client::get("/audit").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|entry| {
                    vec![
                        entry.created_at.format("%m-%d %H:%M:%S").to_string(),
                        entry.source.clone(),
                        entry.action.clone(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["TIME", "SOURCE", "ACTION"], &rows);

            Ok(())
        }
    }
}
