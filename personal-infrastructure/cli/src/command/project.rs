use clap::Subcommand;
use contract::project::SourceKind;
use uuid::Uuid;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// 프로젝트 목록
    List,
    /// 폴더나 git 저장소를 프로젝트로 등록
    Create {
        name: String,
        /// 절대 경로 또는 git URL
        source: String,
        /// 컨테이너가 듣는 포트. 비우면 감지 결과를 쓴다
        #[arg(long)]
        port: Option<u16>,
        /// 환경 묶음. 비우면 name
        #[arg(long)]
        group: Option<String>,
        /// production | staging | preview … 비우면 production
        #[arg(long)]
        environment: Option<String>,
    },
    /// 프로젝트 상세 — 원격 HEAD 와의 드리프트까지
    Show { id: Uuid },
    /// 프로젝트 제거 — 컨테이너를 내리고 포트 예약을 푼다
    Remove {
        id: Uuid,
        /// 지우지 않고 같이 사라질 것만 보여준다
        #[arg(long)]
        dry_run: bool,
    },
    /// 컨테이너 켜기
    Start { id: Uuid },
    /// 컨테이너 끄기 — 포트 예약은 유지
    Stop { id: Uuid },
    /// 컨테이너 튕기기. env 가 배포 뒤에 바뀌었으면 거부한다
    Restart {
        id: Uuid,
        /// stale 이어도 튕긴다
        #[arg(long)]
        force: bool,
    },
    /// CPU·메모리 상한 — 다음 배포부터
    Limits {
        id: Uuid,
        #[arg(long)]
        cpus: Option<f32>,
        #[arg(long)]
        memory_mb: Option<u32>,
    },
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::List => {
            let listed: Vec<contract::project::Output> = client::get("/projects").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|project| {
                    vec![
                        project.id.to_string(),
                        project.name.clone(),
                        format!("{}/{}", project.group, project.environment),
                        project.stack.clone().unwrap_or_else(|| "-".into()),
                        contract::text::of(&project.status),
                        project.commit.as_deref().map(|c| c[..7.min(c.len())].to_owned()).unwrap_or_default(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["ID", "NAME", "GROUP/ENV", "STACK", "STATUS", "COMMIT"], &rows);

            Ok(())
        }
        Command::Create {
            name,
            source,
            port,
            group,
            environment,
        } => {
            let source_kind = if source.starts_with('/') {
                SourceKind::Folder
            } else {
                SourceKind::Git
            };

            let input = contract::project::CreateInput {
                name,
                source_kind,
                source_ref: source,
                port,
                group,
                environment,
            };
            let created: contract::project::Output = client::post("/projects", &input).await?;

            show(&created, None)
        }
        Command::Show { id } => {
            let detailed: contract::project::Detail =
                client::get(&format!("/projects/{id}")).await?;

            show(&detailed.project, Some(detailed.remote_commit))
        }
        Command::Remove { id, dry_run } => {
            if dry_run {
                let preview: contract::project::RemovalPreview =
                    client::get(&format!("/projects/{id}/removal")).await?;

                if output::is_json() {
                    return output::json(&preview);
                }

                output::record(&[
                    ("container", preview.container),
                    ("ports", join(preview.ports.iter().map(u16::to_string))),
                    ("domains", preview.domains.join(", ")),
                    ("volumes", format!("{} (남습니다)", preview.volumes.join(", "))),
                    ("git link", if preview.git_linked { "있음".into() } else { String::new() }),
                ]);

                return Ok(());
            }

            client::delete(&format!("/projects/{id}")).await?;
            output::info("제거했습니다");

            Ok(())
        }
        Command::Start { id } => {
            client::post_empty(&format!("/projects/{id}/start"), &()).await?;
            output::info("켰습니다");

            Ok(())
        }
        Command::Stop { id } => {
            client::post_empty(&format!("/projects/{id}/stop"), &()).await?;
            output::info("껐습니다");

            Ok(())
        }
        Command::Restart { id, force } => {
            client::post_empty(&format!("/projects/{id}/restart?force={force}"), &()).await?;
            output::info("튕겼습니다");

            Ok(())
        }
        Command::Limits { id, cpus, memory_mb } => {
            let input = contract::project::LimitsInput { cpus, memory_mb };
            client::put_empty(&format!("/projects/{id}/limits"), &input).await?;
            output::info("저장 — 다음 배포부터 적용됩니다");

            Ok(())
        }
    }
}

fn join(values: impl Iterator<Item = String>) -> String {
    values.collect::<Vec<_>>().join(", ")
}

fn show(project: &contract::project::Output, remote: Option<Option<String>>) -> anyhow::Result<()> {
    if output::is_json() {
        return output::json(project);
    }

    let commit = project.commit.clone().unwrap_or_default();
    let drift = match (&project.commit, remote.flatten()) {
        (Some(deployed), Some(remote)) if *deployed != remote => format!("원격 HEAD {} 와 다름", &remote[..7.min(remote.len())]),
        (Some(_), Some(_)) => "원격과 일치".to_owned(),
        _ => String::new(),
    };

    output::record(&[
        ("id", project.id.to_string()),
        ("name", project.name.clone()),
        ("group/env", format!("{}/{}", project.group, project.environment)),
        ("source", project.source_ref.clone()),
        ("stack", project.stack.clone().unwrap_or_default()),
        (
            "port",
            project.port.map(|p| p.to_string()).unwrap_or_default(),
        ),
        ("status", contract::text::of(&project.status)),
        (
            "limits",
            match (project.cpus, project.memory_mb) {
                (None, None) => String::new(),
                (cpus, mb) => format!(
                    "{} {}",
                    cpus.map(|c| format!("{c} cpu")).unwrap_or_default(),
                    mb.map(|m| format!("{m} MB")).unwrap_or_default()
                ),
            },
        ),
        ("commit", commit),
        ("drift", drift),
    ]);

    Ok(())
}
