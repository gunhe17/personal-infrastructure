use crate::infrastructure::process;

// #
// scan

/// 사람용 표를 파싱하지 않는다 — `lsof -F` 는 필드마다 접두 문자가 붙는 기계용 출력이다.
/// (사람용 `lsof -iTCP` 는 명령 이름이 9자에서 잘린다.) 결과가 없으면 exit 1 이라 실패를 빈 목록으로 본다.
pub async fn scan_listeners() -> Vec<contract::system::Listener> {
    let raw = process::output("lsof", ["-iTCP", "-sTCP:LISTEN", "-P", "-n", "-F", "pcn"])
        .await
        .unwrap_or_default();

    parse_lsof(&raw)
}

fn parse_lsof(raw: &str) -> Vec<contract::system::Listener> {
    let mut listeners = Vec::new();
    let mut process = String::new();

    for line in raw.lines() {
        let Some((tag, value)) = line.split_at_checked(1) else {
            continue;
        };

        match tag {
            "c" => process = value.to_owned(),
            "n" => {
                let Some((address, port)) = value.rsplit_once(':') else {
                    continue;
                };

                let Ok(port) = port.parse::<u16>() else {
                    continue;
                };

                let address = address
                    .trim_start_matches('[')
                    .trim_end_matches(']')
                    .to_owned();
                let public =
                    !address.starts_with("127.") && address != "::1" && address != "localhost";

                listeners.push(contract::system::Listener {
                    port,
                    process: process.clone(),
                    address,
                    public,
                });
            }
            _ => {}
        }
    }

    listeners.sort_by_key(|listener| listener.port);
    listeners.dedup_by_key(|listener| (listener.port, listener.address.clone()));

    listeners
}

// #
// ownership

/// OpenResty 를 올리기 전에 누가 80/443 을 쥐고 있는지 먼저 본다.
pub async fn edge_port_owner() -> Vec<contract::system::Listener> {
    scan_listeners()
        .await
        .into_iter()
        .filter(|listener| listener.port == 80 || listener.port == 443)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_machine_output_and_marks_exposure() {
        let raw = "p1\ncnginx\nn0.0.0.0:80\np2\ncnode\nn127.0.0.1:3000\n";
        let listeners = parse_lsof(raw);

        assert_eq!(listeners.len(), 2);
        assert_eq!(listeners[0].port, 80);
        assert!(listeners[0].public);
        assert_eq!(listeners[1].process, "node");
        assert!(!listeners[1].public);
    }

    #[test]
    fn ipv6_brackets_are_stripped() {
        let listeners = parse_lsof("p1\ncedge\nn[::1]:443\n");

        assert_eq!(listeners[0].address, "::1");
        assert!(!listeners[0].public);
    }
}
