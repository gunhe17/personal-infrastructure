use std::path::Path;
use std::path::PathBuf;

use hmac::Hmac;
use hmac::Mac;
use sha2::Sha256;

use crate::config;
use crate::infrastructure::process;
use crate::infrastructure::process::ProcessError;
use crate::shared::hex;

// #
// clone

/// 있으면 fetch, 없으면 clone. 작업 폴더는 프로젝트 id 로 고정한다.
pub async fn sync(repository: &str, branch: &str, key: &str) -> Result<PathBuf, ProcessError> {
    let target = config::get().work_dir.join("src").join(key);

    if target.join(".git").exists() {
        process::output_in(&target, "git", ["fetch", "--depth", "1", "origin", branch]).await?;
        process::output_in(&target, "git", ["reset", "--hard", &format!("origin/{branch}")]).await?;

        return Ok(target);
    }

    if let Some(parent) = target.parent() {
        tokio::fs::create_dir_all(parent).await.ok();
    }

    process::output(
        "git",
        [
            "clone",
            "--depth",
            "1",
            "--branch",
            branch,
            repository,
            &target.display().to_string(),
        ],
    )
    .await?;

    Ok(target)
}

// #
// commit

pub async fn head(dir: &Path) -> Option<String> {
    process::output_in(dir, "git", ["rev-parse", "HEAD"])
        .await
        .ok()
        .map(|sha| sha.trim().to_owned())
}

/// 원격에 물어본다 — 상세 조회에서만, 목록에서는 부르지 않는다.
pub async fn remote_head(repository: &str, branch: &str) -> Option<String> {
    let listed = process::output("git", ["ls-remote", repository, &format!("refs/heads/{branch}")])
        .await
        .ok()?;

    listed.split_whitespace().next().map(str::to_owned)
}

// #
// webhook

/// GitHub 은 `sha256=<hex>` 형태로 HMAC 을 보낸다. `verify_slice` 가 상수 시간 비교다.
pub fn verify_signature(secret: &str, body: &[u8], signature: &str) -> bool {
    let provided = signature.trim();
    let provided = provided.strip_prefix("sha256=").unwrap_or(provided);

    let Some(provided) = hex::decode(provided) else {
        return false;
    };
    let Ok(mut mac) = Hmac::<Sha256>::new_from_slice(secret.as_bytes()) else {
        return false;
    };

    mac.update(body);
    mac.verify_slice(&provided).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sign(secret: &str, body: &[u8]) -> String {
        let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(body);

        format!("sha256={:x}", mac.finalize().into_bytes())
    }

    #[test]
    fn signature_matches_known_hmac() {
        // RFC 4231 test case 1
        let key = String::from_utf8(vec![0x0b; 20]).unwrap();

        assert!(verify_signature(
            &key,
            b"Hi There",
            "sha256=b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"
        ));
    }

    #[test]
    fn wrong_secret_is_rejected() {
        let signature = sign("s3cret", b"payload");

        assert!(verify_signature("s3cret", b"payload", &signature));
        assert!(!verify_signature("other", b"payload", &signature));
    }

    #[test]
    fn length_mismatch_is_rejected() {
        assert!(!verify_signature("s3cret", b"payload", "sha256=deadbeef"));
        assert!(!verify_signature("s3cret", b"payload", "sha256=zz"));
    }
}
