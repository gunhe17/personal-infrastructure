use std::io::Read;
use std::io::Write;
use std::path::Path;
use std::sync::OnceLock;

use age::secrecy::ExposeSecret;
use age::x25519::Identity;

// #
// exception

#[derive(thiserror::Error, Debug)]
pub enum CipherError {
    #[error("비밀값을 열지 못했습니다 (원인: {0})")]
    Open(#[from] age::DecryptError),

    #[error(transparent)]
    Io(#[from] std::io::Error),
}

// #
// key

static IDENTITY: OnceLock<Identity> = OnceLock::new();

/// 키 파일이 없으면 만든다 — 데몬만 읽을 수 있게 0600.
/// 서버와 워커가 동시에 뜨므로 생성은 `create_new`(O_EXCL) 로 한 쪽만 이긴다. 진 쪽은 그 파일을 읽는다 —
/// 둘이 다른 키를 들면 서버가 봉인한 것을 워커가 못 연다.
pub async fn init(path: &Path) -> std::io::Result<()> {
    let identity = match tokio::fs::read_to_string(path).await {
        Ok(raw) => parse(&raw)?,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => match create(path).await {
            Ok(generated) => generated,
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
                parse(&tokio::fs::read_to_string(path).await?)?
            }
            Err(error) => return Err(error),
        },
        Err(error) => return Err(error),
    };

    IDENTITY.set(identity).ok();

    Ok(())
}

fn parse(raw: &str) -> std::io::Result<Identity> {
    raw.trim().parse::<Identity>().map_err(std::io::Error::other)
}

/// 내용을 다 쓴 임시 파일을 `hard_link` 로 공개한다 — 링크는 원자적이고 이미 있으면 실패한다.
/// `create_new` 로 열고 쓰면 "파일은 있는데 아직 비어 있는" 순간이 생겨 읽는 쪽이 빈 키를 본다.
async fn create(path: &Path) -> std::io::Result<Identity> {
    let generated = Identity::generate();
    let temp = path.with_extension(format!("tmp.{}", std::process::id()));
    tokio::fs::write(&temp, generated.to_string().expose_secret()).await?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        tokio::fs::set_permissions(&temp, std::fs::Permissions::from_mode(0o600)).await?;
    }

    let published = tokio::fs::hard_link(&temp, path).await;
    tokio::fs::remove_file(&temp).await.ok();
    published?;

    tracing::warn!(
        path = %path.display(),
        "비밀값 키를 새로 만들었습니다. 백업하세요 — 잃으면 저장된 비밀값을 못 엽니다"
    );

    Ok(generated)
}

fn identity() -> &'static Identity {
    IDENTITY.get().expect("cipher not initialised")
}

// #
// seal · open

pub fn seal(plain: &[u8]) -> Vec<u8> {
    let recipient = identity().to_public();
    let mut sealed = Vec::new();

    // 메모리 쓰기와 수신자 하나 — 실패할 길이 없다
    let encryptor = age::Encryptor::with_recipients(std::iter::once(&recipient as &dyn age::Recipient))
        .expect("one recipient");
    let mut writer = encryptor.wrap_output(&mut sealed).expect("in-memory");
    writer.write_all(plain).expect("in-memory");
    writer.finish().expect("in-memory");

    sealed
}

pub fn open(sealed: &[u8]) -> Result<Vec<u8>, CipherError> {
    let decryptor = age::Decryptor::new(sealed)?;
    let mut reader = decryptor.decrypt(std::iter::once(identity() as &dyn age::Identity))?;
    let mut plain = Vec::new();
    reader.read_to_end(&mut plain)?;

    Ok(plain)
}
