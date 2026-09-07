use clap::Subcommand;
use uuid::Uuid;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// 경로 규칙 목록
    Rules {
        #[arg(long)]
        domain_id: Option<Uuid>,
    },
    /// 경로 규칙 추가 — deny | limit | allow
    RuleAdd {
        domain_id: Uuid,
        /// /admin 처럼 / 로 시작
        path: String,
        #[arg(long)]
        action: String,
        /// limit 의 burst
        #[arg(long)]
        rate: Option<i32>,
        /// allow 의 CIDR. 쉼표로 여러 개
        #[arg(long, value_delimiter = ',')]
        cidr: Vec<String>,
    },
    RuleRemove { id: Uuid },
    /// 엣지가 실제로 들고 있는 vhost 파일
    Show,
    /// DB 기준으로 vhost 를 다시 쓰고 리로드
    Reload,
    /// 누가 :80/:443 을 잡고 있나
    Owner,
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::Rules { domain_id } => {
            let path = match domain_id {
                Some(id) => format!("/edge/rules?domain_id={id}"),
                None => "/edge/rules".to_owned(),
            };
            let listed: Vec<contract::edge::RuleOutput> = client::get(&path).await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|rule| {
                    vec![
                        rule.id.to_string(),
                        rule.domain_id.to_string(),
                        rule.path_prefix.clone(),
                        contract::text::of(&rule.action),
                        rule.rate_limit.map(|r| r.to_string()).unwrap_or_default(),
                        rule.cidrs.join(","),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["ID", "DOMAIN", "PATH", "ACTION", "BURST", "CIDRS"], &rows);

            Ok(())
        }
        Command::RuleAdd {
            domain_id,
            path,
            action,
            rate,
            cidr,
        } => {
            let input = contract::edge::RuleInput {
                domain_id,
                path_prefix: path,
                action: contract::text::parse(&action)
                    .ok_or_else(|| anyhow::anyhow!("알 수 없는 action: {action}"))?,
                rate_limit: rate,
                cidrs: cidr,
            };
            let added: contract::edge::RuleOutput = client::post("/edge/rules", &input).await?;

            if output::is_json() {
                return output::json(&added);
            }

            output::record(&[("id", added.id.to_string()), ("path", added.path_prefix)]);
            output::info("엣지에 반영했습니다");

            Ok(())
        }
        Command::RuleRemove { id } => {
            client::delete(&format!("/edge/rules/{id}")).await?;
            output::info("제거했습니다");

            Ok(())
        }
        Command::Show => {
            let listed: Vec<contract::edge::VhostOutput> = client::get("/edge/vhosts").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            for vhost in listed {
                println!("### {}\n{}", vhost.host, vhost.body);
            }

            Ok(())
        }
        Command::Reload => {
            let count: usize = client::post("/edge/reload", &()).await?;
            output::info(&format!("vhost {count}개 반영"));

            Ok(())
        }
        Command::Owner => {
            let listed: Vec<contract::system::Listener> = client::get("/system/listeners").await?;
            let owners: Vec<_> = listed.into_iter().filter(|l| l.port == 80 || l.port == 443).collect();

            if output::is_json() {
                return output::json(&owners);
            }

            if owners.is_empty() {
                output::info(":80/:443 비어 있음");

                return Ok(());
            }

            let rows = owners
                .iter()
                .map(|l| vec![l.port.to_string(), l.process.clone(), l.address.clone()])
                .collect::<Vec<_>>();

            output::table(&["PORT", "PROCESS", "ADDRESS"], &rows);

            Ok(())
        }
    }
}
