use clap::Subcommand;
use contract::backup::DestinationKind;
use contract::backup::TargetKind;
use uuid::Uuid;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// 백업 이력
    List,
    /// 보관 위치 목록
    Destinations,
    /// 보관 위치 추가
    AddDestination { name: String, location: String },
    /// 즉시 백업
    Run {
        destination_id: Uuid,
        /// database | volume
        target_kind: String,
        target_id: Uuid,
    },
    /// 예약 백업 등록
    Schedule {
        destination_id: Uuid,
        target_kind: String,
        target_id: Uuid,
        #[arg(long, default_value_t = 86400)]
        every_seconds: i64,
    },
    /// 복원
    Restore { backup_id: Uuid },
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::List => {
            let listed: Vec<contract::backup::Output> = client::get("/backups").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|backup| {
                    vec![
                        backup.id.to_string(),
                        contract::text::of(&backup.target_kind),
                        contract::text::of(&backup.status),
                        backup
                            .size_bytes
                            .map(|size| format!("{size}"))
                            .unwrap_or_else(|| "-".into()),
                        backup.error.clone().unwrap_or_default(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["ID", "TARGET", "STATUS", "BYTES", "ERROR"], &rows);

            Ok(())
        }
        Command::Destinations => {
            let listed: Vec<contract::backup::DestinationOutput> =
                client::get("/backups/destinations").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|dest| {
                    vec![
                        dest.id.to_string(),
                        dest.name.clone(),
                        dest.location.clone(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["ID", "NAME", "LOCATION"], &rows);

            Ok(())
        }
        Command::AddDestination { name, location } => {
            let input = contract::backup::CreateDestinationInput {
                name,
                kind: DestinationKind::Local,
                location,
            };
            let created: contract::backup::DestinationOutput =
                client::post("/backups/destinations", &input).await?;

            if output::is_json() {
                return output::json(&created);
            }

            output::record(&[
                ("id", created.id.to_string()),
                ("location", created.location),
            ]);

            Ok(())
        }
        Command::Run {
            destination_id,
            target_kind,
            target_id,
        } => {
            let input = contract::backup::RunInput {
                destination_id,
                target_kind: parse_target(&target_kind)?,
                target_id,
            };
            let created: contract::backup::Output = client::post("/backups", &input).await?;

            if output::is_json() {
                return output::json(&created);
            }

            output::record(&[
                ("id", created.id.to_string()),
                ("status", contract::text::of(&created.status)),
                ("artifact", created.artifact.clone().unwrap_or_default()),
                (
                    "bytes",
                    created
                        .size_bytes
                        .map(|s| s.to_string())
                        .unwrap_or_default(),
                ),
            ]);

            Ok(())
        }
        Command::Schedule {
            destination_id,
            target_kind,
            target_id,
            every_seconds,
        } => {
            let input = contract::backup::ScheduleInput {
                destination_id,
                target_kind: parse_target(&target_kind)?,
                target_id,
                every_seconds,
            };

            client::post_empty("/backups/schedules", &input).await?;
            output::info("예약했습니다");

            Ok(())
        }
        Command::Restore { backup_id } => {
            let input = contract::backup::RestoreInput { backup_id };

            client::post_empty("/backups/restore", &input).await?;
            output::info("복원했습니다");

            Ok(())
        }
    }
}

fn parse_target(value: &str) -> anyhow::Result<TargetKind> {
    contract::text::parse(value).ok_or_else(|| anyhow::anyhow!("알 수 없는 대상: {value}"))
}
