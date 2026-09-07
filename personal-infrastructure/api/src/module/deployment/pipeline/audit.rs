use std::time::Duration;

use sqlx::PgPool;
use uuid::Uuid;

use crate::infrastructure::docker;
use crate::module::deployment::domain::log;
use crate::module::project::domain::Port;

// #
// audit

/// 배포 뒤 컨테이너가 실제로 그 포트를 듣는지 — `/proc/net/tcp` 를 읽어 컨테이너에 도구가 없어도 본다.
/// 경고만 남기고 배포는 절대 안 깨뜨린다. 워커가 spawn 해서 배포 완료를 기다리게 하지 않는다.
pub async fn run(pool: &'static PgPool, deployment_id: Uuid, container: String, port: Port) {
    let mut last = String::new();

    for _ in 0..10 {
        tokio::time::sleep(Duration::from_secs(1)).await;

        match listening(&container, port).await {
            Ok(true) => {
                let _ = log::append(pool, deployment_id, "audit", &format!("listening on :{}", port.to_u16())).await;

                return;
            }
            Ok(false) => last = "듣는 포트에 없음".to_owned(),
            Err(error) => last = error.to_string(),
        }
    }

    let _ = log::append(
        pool,
        deployment_id,
        "warn",
        &format!(
            "audit: 컨테이너가 :{} 를 듣지 않습니다 ({last}) — 앱 포트 설정을 확인하세요 (`project create --port`)",
            port.to_u16()
        ),
    )
    .await;
}

async fn listening(container: &str, port: Port) -> Result<bool, crate::infrastructure::process::ProcessError> {
    let raw = docker::client::exec(container, &["sh", "-c", "cat /proc/net/tcp /proc/net/tcp6 2>/dev/null"]).await?;

    Ok(listens(&String::from_utf8_lossy(&raw), port.to_u16()))
}

/// `local_address` 는 `hex_ip:hex_port`, `st` 0A 가 LISTEN.
fn listens(proc_net_tcp: &str, port: u16) -> bool {
    proc_net_tcp.lines().any(|line| {
        let fields: Vec<&str> = line.split_whitespace().collect();

        fields.len() > 3
            && fields[3] == "0A"
            && fields[1]
                .rsplit(':')
                .next()
                .and_then(|hex| u16::from_str_radix(hex, 16).ok())
                == Some(port)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE: &str = "  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode\n   0: 00000000:0050 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 12345 1 0000000000000000 100 0 0 10 0\n   1: 0100007F:1F90 0100007F:C350 01 00000000:00000000 00:00000000 00000000     0        0 12346 1 0000000000000000 20 4 30 10 -1\n";

    #[test]
    fn finds_listen_state_only() {
        assert!(listens(SAMPLE, 80));
        assert!(!listens(SAMPLE, 8080));
        assert!(!listens("", 80));
    }
}
