use clap::Subcommand;
use contract::domain_name::TlsMode;
use uuid::Uuid;

use crate::client;
use crate::output;

// #
// command

#[derive(Subcommand)]
pub enum Command {
    /// 도메인 목록
    List,
    /// 프로젝트에 도메인 연결 — vhost 가 자동 생성된다
    Attach {
        project_id: Uuid,
        host: String,
        /// none | acme | manual | self_signed
        #[arg(long, default_value = "acme")]
        tls: String,
        #[arg(long)]
        path: Option<String>,
    },
    /// 도메인 제거
    Detach { id: Uuid },
    /// 인증서 목록
    Certs,
    /// 지금 발급 — 워커의 다음 주기를 기다리지 않는다
    Ssl { id: Uuid },
    /// 직접 발급한 인증서 업로드
    UploadCert {
        host: String,
        cert_file: String,
        key_file: String,
    },
}

// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::List => {
            let listed: Vec<contract::domain_name::Output> = client::get("/domains").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|domain| {
                    vec![
                        domain.id.to_string(),
                        domain.host.clone(),
                        domain.path_prefix.clone(),
                        contract::text::of(&domain.tls_mode),
                        contract::text::of(&domain.status),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["ID", "HOST", "PATH", "TLS", "STATUS"], &rows);

            Ok(())
        }
        Command::Attach {
            project_id,
            host,
            tls,
            path,
        } => {
            let tls_mode: TlsMode = contract::text::parse(&tls.replace('-', "_"))
                .ok_or_else(|| anyhow::anyhow!("알 수 없는 tls 모드: {tls}"))?;

            let input = contract::domain_name::AttachInput {
                project_id,
                host,
                path_prefix: path,
                tls_mode,
            };
            let attached: contract::domain_name::Output = client::post("/domains", &input).await?;

            if output::is_json() {
                return output::json(&attached);
            }

            output::record(&[
                ("id", attached.id.to_string()),
                ("host", attached.host.clone()),
                ("tls", contract::text::of(&attached.tls_mode)),
                ("status", contract::text::of(&attached.status)),
            ]);
            output::info("인증서 발급과 엣지 반영은 워커가 이어서 합니다");

            Ok(())
        }
        Command::Detach { id } => {
            client::delete(&format!("/domains/{id}")).await?;
            output::info("제거했습니다");

            Ok(())
        }
        Command::Ssl { id } => {
            client::post_empty(&format!("/domains/{id}/ssl"), &()).await?;
            output::info("발급하고 엣지에 반영했습니다");

            Ok(())
        }
        Command::Certs => {
            let listed: Vec<contract::domain_name::CertificateOutput> =
                client::get("/certificates").await?;

            if output::is_json() {
                return output::json(&listed);
            }

            let rows = listed
                .iter()
                .map(|cert| {
                    vec![
                        cert.host.clone(),
                        cert.issuer.clone(),
                        cert.not_after.format("%Y-%m-%d").to_string(),
                    ]
                })
                .collect::<Vec<_>>();

            output::table(&["HOST", "ISSUER", "EXPIRES"], &rows);

            Ok(())
        }
        Command::UploadCert {
            host,
            cert_file,
            key_file,
        } => {
            let input = contract::domain_name::UploadCertInput {
                host,
                cert_pem: std::fs::read_to_string(cert_file)?,
                key_pem: std::fs::read_to_string(key_file)?,
            };

            client::post_empty("/certificates", &input).await?;
            output::info("등록했습니다");

            Ok(())
        }
    }
}
