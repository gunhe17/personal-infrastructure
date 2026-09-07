use std::path::Path;

use crate::infrastructure::process;
use crate::infrastructure::process::ProcessError;

/// 우리가 띄운 컨테이너 표시 — 남의 것과 가른다.
pub const LABEL: &str = "pi.managed=true";

// #
// build

/// `docker build` 를 돌리며 출력 한 줄마다 `on_line` 을 부른다.
/// `--progress=plain` 이라 사람용 진행 표시가 아니라 줄 단위 기계 출력이 온다.
pub async fn build<F, Fut>(
    context: &Path,
    dockerfile: &Path,
    tag: &str,
    on_line: F,
) -> Result<(), ProcessError>
where
    F: FnMut(String) -> Fut,
    Fut: Future<Output = ()>,
{
    process::stream(
        "docker",
        [
            "build",
            "--progress=plain",
            "--file",
            &dockerfile.display().to_string(),
            "--tag",
            tag,
            &context.display().to_string(),
        ],
        on_line,
    )
    .await
}

// #
// run

/// `docker run` 의 매개변수. 앱 포트는 언제나 루프백에만 publish 한다 — 외부 노출은 엣지가 담당한다.
#[derive(Default)]
pub struct Run {
    pub name: String,
    pub image: String,
    pub publish: Option<(u16, u16)>,
    pub env: Vec<(String, String)>,
    pub mounts: Vec<(String, String)>,
    pub network_host: bool,
    pub cpus: Option<f32>,
    pub memory_mb: Option<i32>,
    /// 0.0.0.0 에 여는 포트 — 메일(25/465/587/993)처럼 엣지를 못 타는 것만. 앱은 쓰지 않는다
    pub publish_public: Vec<(u16, u16)>,
    pub args: Vec<String>,
}

pub async fn run(spec: Run) -> Result<String, ProcessError> {
    let mut args: Vec<String> = [
        "run",
        "--detach",
        "--name",
        &spec.name,
        "--restart",
        "unless-stopped",
        "--label",
        LABEL,
    ]
    .iter()
    .map(|value| value.to_string())
    .collect();

    if spec.network_host {
        args.extend(["--network".into(), "host".into()]);
    }

    if let Some((host, container)) = spec.publish {
        args.extend(["--publish".into(), format!("127.0.0.1:{host}:{container}")]);
    }

    for (host, container) in &spec.publish_public {
        args.extend(["--publish".into(), format!("0.0.0.0:{host}:{container}")]);
    }

    for (key, value) in &spec.env {
        args.extend(["--env".into(), format!("{key}={value}")]);
    }

    for (volume, path) in &spec.mounts {
        args.extend(["--volume".into(), format!("{volume}:{path}")]);
    }

    if let Some(cpus) = spec.cpus {
        args.extend(["--cpus".into(), cpus.to_string()]);
    }

    if let Some(memory_mb) = spec.memory_mb {
        args.extend(["--memory".into(), format!("{memory_mb}m")]);
    }

    args.push(spec.image.clone());
    args.extend(spec.args.iter().cloned());

    let id = process::output("docker", &args).await?;

    Ok(id.trim().to_owned())
}

/// 없는 컨테이너를 지우는 것은 실패가 아니다.
pub async fn remove(name: &str) {
    let _ = process::output("docker", ["rm", "--force", name]).await;
}

// #
// lifecycle

pub async fn start(name: &str) -> Result<(), ProcessError> {
    process::output("docker", ["start", name]).await?;

    Ok(())
}

pub async fn stop(name: &str) -> Result<(), ProcessError> {
    process::output("docker", ["stop", name]).await?;

    Ok(())
}

pub async fn restart(name: &str) -> Result<(), ProcessError> {
    process::output("docker", ["restart", name]).await?;

    Ok(())
}

// #
// exec

/// 컨테이너 안에서 명령을 돌리고 stdout 을 돌려준다. 백업이 이걸 탄다.
pub async fn exec(name: &str, args: &[&str]) -> Result<Vec<u8>, ProcessError> {
    let mut command = vec!["exec", name];
    command.extend_from_slice(args);

    process::output_bytes("docker", command).await
}

/// stdin 을 컨테이너 안 명령에 흘린다 — 복원이 이걸 탄다.
pub async fn exec_stdin(name: &str, args: &[&str], input: &[u8]) -> Result<(), ProcessError> {
    let mut command = vec!["exec", "--interactive", name];
    command.extend_from_slice(args);

    process::input("docker", command, input).await
}

// #
// query

/// id 를 여러 개 한 번에 넘긴다 — 컨테이너마다 부르지 않는다.
pub async fn inspect_status(names: &[String]) -> Result<Vec<(String, String)>, ProcessError> {
    if names.is_empty() {
        return Ok(Vec::new());
    }

    let mut args: Vec<&str> = vec!["inspect", "--format", "{{.Name}}|{{.State.Status}}"];
    args.extend(names.iter().map(String::as_str));

    let listed = process::output("docker", args).await?;

    Ok(listed
        .lines()
        .filter_map(|line| line.split_once('|'))
        .map(|(name, status)| (name.trim_start_matches('/').to_owned(), status.to_owned()))
        .collect())
}

pub async fn is_running(name: &str) -> bool {
    inspect_status(&[name.to_owned()])
        .await
        .map(|rows| rows.iter().any(|(_, status)| status == "running"))
        .unwrap_or(false)
}

/// 우리가 띄운 컨테이너만 — 라벨로 남의 것과 가른다.
pub async fn list_managed() -> Result<Vec<(String, String)>, ProcessError> {
    let listed = process::output(
        "docker",
        [
            "ps",
            "--all",
            "--filter",
            &format!("label={LABEL}"),
            "--format",
            "{{.Names}}|{{.State}}",
        ],
    )
    .await?;

    Ok(listed
        .lines()
        .filter_map(|line| line.split_once('|'))
        .map(|(name, state)| (name.to_owned(), state.to_owned()))
        .collect())
}

// #
// image

pub async fn pull(image: &str) -> Result<(), ProcessError> {
    process::output("docker", ["pull", image]).await?;

    Ok(())
}

/// 이미지(베이스 이미지 포함)가 EXPOSE 한 포트 — Dockerfile 에 안 적혀 있어도 여기엔 있다.
pub async fn image_ports(image: &str) -> Vec<u16> {
    let raw = process::output("docker", ["inspect", "--type", "image", "--format", "{{json .Config.ExposedPorts}}", image])
        .await
        .unwrap_or_default();
    let mut ports: Vec<u16> = serde_json::from_str::<serde_json::Value>(raw.trim())
        .ok()
        .and_then(|value| value.as_object().map(|o| o.keys().filter_map(|k| k.split('/').next()?.parse().ok()).collect()))
        .unwrap_or_default();
    ports.sort_unstable();

    ports
}

pub async fn remove_image(image: &str) {
    let _ = process::output("docker", ["rmi", image]).await;
}

// #
// volume

pub async fn create_volume(name: &str) -> Result<(), ProcessError> {
    process::output("docker", ["volume", "create", name]).await?;

    Ok(())
}

pub async fn remove_volume(name: &str) {
    let _ = process::output("docker", ["volume", "rm", name]).await;
}

/// 도우미 컨테이너로 tar 를 떠서 stdout 으로 받는다.
pub async fn export_volume(name: &str) -> Result<Vec<u8>, ProcessError> {
    process::output_bytes(
        "docker",
        [
            "run",
            "--rm",
            "--volume",
            &format!("{name}:/data:ro"),
            "alpine:3",
            "tar",
            "-cf",
            "-",
            "-C",
            "/data",
            ".",
        ],
    )
    .await
}

pub async fn import_volume(name: &str, tar: &[u8]) -> Result<(), ProcessError> {
    process::input(
        "docker",
        [
            "run",
            "--rm",
            "--interactive",
            "--volume",
            &format!("{name}:/data"),
            "alpine:3",
            "tar",
            "-xf",
            "-",
            "-C",
            "/data",
        ],
        tar,
    )
    .await
}

// #
// foreign

/// 우리 라벨이 없는 컨테이너 이름 — 흡수 후보.
pub async fn list_foreign() -> Result<Vec<String>, ProcessError> {
    let all = process::output("docker", ["ps", "--all", "--format", "{{.Names}}"]).await?;
    let managed: Vec<String> = list_managed().await?.into_iter().map(|(name, _)| name).collect();

    Ok(all
        .lines()
        .map(str::to_owned)
        .filter(|name| !managed.contains(name))
        .collect())
}

/// `docker inspect` 원문(JSON). 호출부가 필요한 필드만 뽑는다.
pub async fn inspect(name: &str) -> Result<serde_json::Value, ProcessError> {
    let raw = process::output("docker", ["inspect", "--format", "{{json .}}", name]).await?;

    serde_json::from_str(&raw).map_err(|error| ProcessError {
        program: "docker inspect",
        reason: error.to_string(),
    })
}

pub async fn logs_since(name: &str, since: &str) -> Result<String, ProcessError> {
    process::output("docker", ["logs", "--since", since, name]).await
}

// #
// stats

/// 우리 컨테이너의 CPU%·메모리 — 한 번 찍고 끝(`--no-stream`).
pub async fn stats() -> Result<Vec<(String, f32, i64)>, ProcessError> {
    let raw = process::output(
        "docker",
        ["stats", "--no-stream", "--format", "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}"],
    )
    .await?;

    Ok(raw.lines().filter_map(parse_stat).collect())
}

fn parse_stat(line: &str) -> Option<(String, f32, i64)> {
    let mut fields = line.split('|');
    let name = fields.next()?.to_owned();
    let cpu = fields.next()?.trim_end_matches('%').parse::<f32>().ok()?;
    let mem = fields.next()?.split('/').next()?.trim();

    Some((name, cpu, bytes(mem)?))
}

/// "12.3MiB" → 바이트.
fn bytes(value: &str) -> Option<i64> {
    let digits: String = value.chars().take_while(|c| c.is_ascii_digit() || *c == '.').collect();
    let unit = value[digits.len()..].trim();
    let scale: f64 = match unit {
        "B" => 1.0,
        "kB" | "KiB" => 1024.0,
        "MB" | "MiB" => 1024.0 * 1024.0,
        "GB" | "GiB" => 1024.0 * 1024.0 * 1024.0,
        _ => return None,
    };

    Some((digits.parse::<f64>().ok()? * scale) as i64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_docker_stats_line() {
        let (name, cpu, mem) = parse_stat("smoke|0.15%|12.5MiB / 7.66GiB").unwrap();

        assert_eq!(name, "smoke");
        assert!((cpu - 0.15).abs() < 1e-6);
        assert_eq!(mem, (12.5 * 1024.0 * 1024.0) as i64);
    }
}
