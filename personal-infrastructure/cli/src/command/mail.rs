use clap::Subcommand;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// Stalwart 메일 서버를 띄운다 — SMTP·IMAP·관리 UI 하나로
    Setup {
        domain: String,
        /// ufw/firewalld 가 있으면 25·465·587·993 을 연다
        #[arg(long)]
        open_firewall: bool,
    },
    Status,
    /// 등록할 DNS 레코드
    Dns,
    /// 컨테이너만 내린다 — 메일함 볼륨은 남는다
    Remove,
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::Setup { domain, open_firewall } => {
            let input = contract::mail::SetupInput { domain, open_firewall };
            let status: contract::mail::Status = client::post("/mail", &input).await?;

            show(&status)?;
            output::info("관리자 첫 비밀번호: docker logs pi-mail | grep -i password  ·  DNS: pi mail dns");

            Ok(())
        }
        Command::Status => {
            let status: contract::mail::Status = client::get("/mail").await?;

            show(&status)
        }
        Command::Dns => {
            let records: Vec<contract::mail::DnsRecord> = client::get("/mail/dns").await?;

            if output::is_json() {
                return output::json(&records);
            }

            let rows = records
                .iter()
                .map(|r| vec![r.name.clone(), r.kind.clone(), r.value.clone(), r.note.clone()])
                .collect::<Vec<_>>();

            output::table(&["NAME", "TYPE", "VALUE", "NOTE"], &rows);

            Ok(())
        }
        Command::Remove => {
            client::delete("/mail").await?;
            output::info("내렸습니다 (메일함 볼륨 pi-mail 은 남아 있습니다)");

            Ok(())
        }
    }
}

fn show(status: &contract::mail::Status) -> anyhow::Result<()> {
    if output::is_json() {
        return output::json(status);
    }

    output::record(&[
        ("domain", status.domain.clone().unwrap_or_default()),
        ("running", status.running.to_string()),
        ("admin", status.admin_url.clone().unwrap_or_default()),
        (
            "listening",
            status.listening.iter().map(u16::to_string).collect::<Vec<_>>().join(","),
        ),
        ("firewall", status.firewall_hint.clone().unwrap_or_default()),
    ]);

    Ok(())
}
