use clap::Subcommand;
use uuid::Uuid;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// 볼륨 목록
    List,
    /// 볼륨 생성
    Create {
        name: String,
        mount_path: String,
        #[arg(long)]
        project_id: Option<Uuid>,
    },
    /// 볼륨 삭제
    Remove { id: Uuid },
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::List => {
            let listed: Vec<contract::volume::Output> = client::get("/volumes").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|volume| {
                    vec![
                        volume.id.to_string(),
                        volume.name.clone(),
                        volume.mount_path.clone(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["ID", "NAME", "MOUNT"], &rows);

            Ok(())
        }
        Command::Create {
            name,
            mount_path,
            project_id,
        } => {
            let input = contract::volume::CreateInput {
                name,
                mount_path,
                project_id,
            };
            let created: contract::volume::Output = client::post("/volumes", &input).await?;

            if output::is_json() {
                return output::json(&created);
            }

            output::record(&[("id", created.id.to_string()), ("name", created.name)]);

            Ok(())
        }
        Command::Remove { id } => {
            client::delete(&format!("/volumes/{id}")).await?;
            output::info("삭제했습니다");

            Ok(())
        }
    }
}
