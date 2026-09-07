use clap::Subcommand;
use contract::database::Engine;
use uuid::Uuid;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// 데이터베이스 목록
    List,
    /// 카탈로그 — 띄울 수 있는 엔진과 앱 (minio 포함)
    Engines,
    /// 데이터베이스 인스턴스 생성 — 컨테이너와 볼륨이 함께 뜬다
    Create {
        name: String,
        /// postgres | mysql | redis | mongo | minio — `engines` 로 목록
        engine: String,
        #[arg(long)]
        version: Option<String>,
    },
    /// 접속 문자열 — 비밀번호가 포함된다
    Url { id: Uuid },
    /// 제거 — 볼륨은 남긴다
    Remove { id: Uuid },
    /// 접속 문자열을 프로젝트 env 에 secret 으로 — 다음 배포부터
    Connect {
        id: Uuid,
        project_id: Uuid,
        /// 비우면 DATABASE_URL (minio 는 S3_URL)
        #[arg(long)]
        key: Option<String>,
    },
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::List => {
            let listed: Vec<contract::database::Output> = client::get("/databases").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|db| {
                    vec![
                        db.id.to_string(),
                        db.name.clone(),
                        format!("{}:{}", contract::text::of(&db.engine), db.version),
                        db.host_port.to_string(),
                        contract::text::of(&db.status),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["ID", "NAME", "ENGINE", "PORT", "STATUS"], &rows);

            Ok(())
        }
        Command::Engines => {
            let listed: Vec<contract::database::EngineInfo> = client::get("/databases/engines").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|info| {
                    vec![
                        contract::text::of(&info.engine),
                        info.image.clone(),
                        info.description.clone(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["ENGINE", "IMAGE", ""], &rows);

            Ok(())
        }
        Command::Create {
            name,
            engine,
            version,
        } => {
            let engine: Engine = contract::text::parse(&engine)
                .ok_or_else(|| anyhow::anyhow!("알 수 없는 엔진: {engine}"))?;

            let input = contract::database::CreateInput {
                name,
                engine,
                version,
            };
            let created: contract::database::Output = client::post("/databases", &input).await?;

            if output::is_json() {
                return output::json(&created);
            }

            output::record(&[
                ("id", created.id.to_string()),
                ("name", created.name.clone()),
                ("port", created.host_port.to_string()),
                ("status", contract::text::of(&created.status)),
            ]);
            output::info("컨테이너는 워커가 띄웁니다 — `pi database list` 로 상태를, `pi database url <id>` 로 접속 문자열을 봅니다");

            Ok(())
        }
        Command::Url { id } => {
            let revealed: contract::database::Connection =
                client::get(&format!("/databases/{id}/connection")).await?;

            println!("{}", revealed.url);

            Ok(())
        }
        Command::Connect { id, project_id, key } => {
            let input = contract::database::ConnectInput { project_id, key };
            let key: String = client::post(&format!("/databases/{id}/connect"), &input).await?;
            output::info(&format!("{key} 를 secret env 로 넣었습니다 — 다음 배포부터 반영"));

            Ok(())
        }
        Command::Remove { id } => {
            client::delete(&format!("/databases/{id}")).await?;
            output::info("제거했습니다 (볼륨은 남아 있습니다)");

            Ok(())
        }
    }
}
