use clap::Subcommand;

use crate::config;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// 서버 주소와 토큰을 저장한다
    Set {
        #[arg(long)]
        api_url: Option<String>,
        #[arg(long)]
        token: Option<String>,
    },
    /// 지금 설정을 보여준다
    Show,
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::Set { api_url, token } => {
            let mut context = config::load();

            if api_url.is_some() {
                context.api_url = api_url;
            }

            if token.is_some() {
                context.token = token;
            }

            config::save(&context)?;
            output::info(&format!("저장했습니다: {}", config::path().display()));

            Ok(())
        }
        Command::Show => {
            output::record(&[
                ("api_url", config::api_url()),
                ("token", config::token().map(mask).unwrap_or_default()),
                ("path", config::path().display().to_string()),
            ]);

            Ok(())
        }
    }
}

fn mask(value: String) -> String {
    let head: String = value.chars().take(7).collect();

    format!("{head}…")
}
