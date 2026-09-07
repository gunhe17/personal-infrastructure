use chrono::DateTime;
use chrono::Utc;

use crate::infrastructure::acme::exception::AcmeError;
use crate::infrastructure::edge::client as edge;
use crate::infrastructure::process;

// #
// issued

pub struct Issued {
    pub certificate: String,
    pub key: String,
    pub issuer: String,
    pub not_after: DateTime<Utc>,
}

// #
// self signed

/// 로컬·사설 도메인용. openssl 이 이미 깔려 있어 별도 crypto 의존을 들이지 않는다.
pub async fn self_signed(host: &str) -> Result<Issued, AcmeError> {
    let dir = std::env::temp_dir().join(format!("pi-cert-{}", uuid::Uuid::new_v4().simple()));
    tokio::fs::create_dir_all(&dir).await?;

    let key_path = dir.join("key.pem");
    let cert_path = dir.join("cert.pem");

    process::output(
        "openssl",
        [
            "req",
            "-x509",
            "-newkey",
            "rsa:2048",
            "-nodes",
            "-days",
            "825",
            "-sha256",
            "-keyout",
            &key_path.display().to_string(),
            "-out",
            &cert_path.display().to_string(),
            "-subj",
            &format!("/CN={host}"),
            "-addext",
            &format!("subjectAltName=DNS:{host}"),
        ],
    )
    .await
    .map_err(|error| AcmeError::Issue {
        host: host.into(),
        reason: error.reason,
    })?;

    let certificate = tokio::fs::read_to_string(&cert_path).await?;
    let key = tokio::fs::read_to_string(&key_path).await?;
    tokio::fs::remove_dir_all(&dir).await.ok();

    Ok(Issued {
        certificate,
        key,
        issuer: "self-signed".to_owned(),
        not_after: Utc::now() + chrono::Duration::days(825),
    })
}

// #
// acme

/// Let's Encrypt HTTP-01. challenge 파일을 엣지가 :80 에서 서빙하는 폴더에 놓는다.
/// 앱이 뜬 뒤에 진행되므로 발급 실패가 배포를 죽이지 않는다.
pub async fn issue_http01(host: &str, account_email: &str) -> Result<Issued, AcmeError> {
    let mut args = certbot_args(host, account_email, crate::config::get());
    args.extend(["--webroot".to_owned(), "--webroot-path".to_owned(), edge::acme_dir().display().to_string()]);

    certbot(host, args).await
}

/// 와일드카드는 DNS-01 — Cloudflare 플러그인. 토큰은 0600 ini 로 넘긴다.
pub async fn issue_dns01(host: &str, account_email: &str, cloudflare_token: &str) -> Result<Issued, AcmeError> {
    let ini = crate::config::get().work_dir.join("edge/cloudflare.ini");
    tokio::fs::write(&ini, format!("dns_cloudflare_api_token = {cloudflare_token}\n")).await?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        tokio::fs::set_permissions(&ini, std::fs::Permissions::from_mode(0o600)).await?;
    }

    let mut args = certbot_args(host, account_email, crate::config::get());
    args.extend([
        "--dns-cloudflare".to_owned(),
        "--dns-cloudflare-credentials".to_owned(),
        ini.display().to_string(),
    ]);

    certbot(host, args).await
}

/// 공통 인자 — 다른 CA 는 디렉터리 URL 과 EAB 만 다르다.
fn certbot_args(host: &str, account_email: &str, config: &crate::config::AppConfig) -> Vec<String> {
    // 전부 work_dir 아래 — root 도 /etc/letsencrypt 도 필요 없다 (Mac 포함)
    let base = config.work_dir.join("letsencrypt");
    let mut args = vec![
        "certonly".to_owned(),
        "--non-interactive".to_owned(),
        "--agree-tos".to_owned(),
        "--config-dir".to_owned(),
        base.display().to_string(),
        "--work-dir".to_owned(),
        base.join("work").display().to_string(),
        "--logs-dir".to_owned(),
        base.join("logs").display().to_string(),
        "--email".to_owned(),
        account_email.to_owned(),
        "-d".to_owned(),
        host.to_owned(),
    ];

    if let Some(directory) = &config.acme_directory {
        args.extend(["--server".to_owned(), directory.clone()]);
    }
    if let Some((kid, hmac)) = &config.acme_eab {
        args.extend(["--eab-kid".to_owned(), kid.clone(), "--eab-hmac-key".to_owned(), hmac.clone()]);
    }

    args
}

async fn certbot(host: &str, args: Vec<String>) -> Result<Issued, AcmeError> {
    // certbot 이 없으면 여기서 실패한다 — 호출부는 다음 주기에 다시 온다
    process::output("certbot", args)
        .await
        .map_err(|error| AcmeError::Issue {
            host: host.into(),
            reason: error.reason,
        })?;

    let base = crate::config::get()
        .work_dir
        .join("letsencrypt/live")
        .join(host.trim_start_matches("*."));
    let certificate = tokio::fs::read_to_string(base.join("fullchain.pem")).await?;
    let key = tokio::fs::read_to_string(base.join("privkey.pem")).await?;

    Ok(Issued {
        certificate,
        key,
        issuer: "letsencrypt".to_owned(),
        not_after: Utc::now() + chrono::Duration::days(90),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn custom_ca_adds_server_and_eab() {
        let config = crate::config::AppConfig {
            port: 0,
            database_url: String::new(),
            work_dir: std::path::PathBuf::new(),
            secret_key: std::path::PathBuf::new(),
            acme_directory: Some("https://acme.zerossl.com/v2/DV90".into()),
            acme_eab: Some(("kid".into(), "hmac".into())),
            worker_fast: false,
            wui_dir: None,
        };
        let args = certbot_args("a.example.com", "me@example.com", &config);

        assert!(args.windows(2).any(|w| w == ["--server", "https://acme.zerossl.com/v2/DV90"]));
        assert!(args.windows(2).any(|w| w == ["--eab-kid", "kid"]));
        assert!(args.windows(2).any(|w| w == ["--eab-hmac-key", "hmac"]));
    }
}
