use contract::migration::Foreign;
use contract::migration::PortMap;

// #
// foreign

/// `docker inspect` 에서 흡수에 필요한 것만 — 이미지·상태·포트·마운트·env.
pub fn from_inspect(name: &str, inspected: &serde_json::Value) -> Foreign {
    let str_at = |path: &[&str]| {
        let mut cursor = inspected;
        for key in path {
            cursor = &cursor[*key];
        }
        cursor.as_str().unwrap_or_default().to_owned()
    };

    let mut ports: Vec<PortMap> = inspected["HostConfig"]["PortBindings"]
        .as_object()
        .into_iter()
        .flat_map(|bindings| bindings.iter())
        .filter_map(|(key, hosts)| {
            let container = key.split('/').next()?.parse().ok()?;
            let host = hosts.as_array()?.first()?["HostPort"].as_str()?.parse().ok()?;

            Some(PortMap { host, container })
        })
        .collect();
    ports.sort_by_key(|map| map.container);

    // 노출 포트가 하나도 없으면 이미지의 EXPOSE 를 컨테이너 포트 후보로
    if ports.is_empty() {
        for key in inspected["Config"]["ExposedPorts"].as_object().into_iter().flat_map(|o| o.keys()) {
            if let Some(container) = key.split('/').next().and_then(|p| p.parse().ok()) {
                ports.push(PortMap { host: 0, container });
            }
        }
    }

    let mounts = inspected["Mounts"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|mount| {
            let source = mount["Name"].as_str().or(mount["Source"].as_str())?;
            let target = mount["Destination"].as_str()?;

            Some(format!("{source}:{target}"))
        })
        .collect();

    let env = inspected["Config"]["Env"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|value| value.as_str().map(str::to_owned))
        .collect();

    Foreign {
        name: name.to_owned(),
        image: str_at(&["Config", "Image"]),
        state: str_at(&["State", "Status"]),
        ports,
        mounts,
        env,
    }
}

/// docker 이름(`_` `.` 허용)을 우리 Name(`[a-z0-9-]`)으로.
pub fn project_name(container: &str) -> String {
    container
        .trim_start_matches('/')
        .to_ascii_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .chars()
        .take(40)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_ports_mounts_env() {
        let inspected = serde_json::json!({
            "Config": { "Image": "nginx:1.27", "Env": ["A=1"], "ExposedPorts": { "80/tcp": {} } },
            "State": { "Status": "running" },
            "HostConfig": { "PortBindings": { "80/tcp": [ { "HostIp": "0.0.0.0", "HostPort": "8080" } ] } },
            "Mounts": [ { "Name": "data", "Source": "/var/lib/docker/volumes/data/_data", "Destination": "/data" } ]
        });
        let foreign = from_inspect("web_1", &inspected);

        assert_eq!(foreign.image, "nginx:1.27");
        assert_eq!(foreign.ports[0].host, 8080);
        assert_eq!(foreign.ports[0].container, 80);
        assert_eq!(foreign.mounts, vec!["data:/data"]);
        assert_eq!(foreign.env, vec!["A=1"]);
        assert_eq!(project_name("Web_1"), "web-1");
    }
}
