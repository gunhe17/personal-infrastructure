use std::path::Path;

use crate::infrastructure::process;
use crate::infrastructure::process::ProcessError;

// #
// up

/// compose 파일을 고치지 않고 그대로 올린다 — 프로젝트 이름으로 네임스페이스만 가른다.
/// env 는 `--env-file` 로 — compose 가 `${VAR}` 보간과 서비스 env 양쪽에 쓴다.
pub async fn up<F, Fut>(
    file: &Path,
    project: &str,
    env_file: Option<&Path>,
    on_line: F,
) -> Result<(), ProcessError>
where
    F: FnMut(String) -> Fut,
    Fut: Future<Output = ()>,
{
    let mut args = vec![
        "compose".to_owned(),
        "--file".to_owned(),
        file.display().to_string(),
        "--project-name".to_owned(),
        project.to_owned(),
    ];

    if let Some(env_file) = env_file {
        args.extend(["--env-file".to_owned(), env_file.display().to_string()]);
    }

    args.extend(["up", "--build", "--detach", "--remove-orphans"].map(String::from));

    process::stream("docker", args, on_line).await
}

/// start | stop | restart — 스택 전체.
pub async fn control(project: &str, verb: &'static str) -> Result<(), ProcessError> {
    process::output("docker", ["compose", "--project-name", project, verb]).await?;

    Ok(())
}

pub async fn down(project: &str) {
    let _ = process::output(
        "docker",
        ["compose", "--project-name", project, "down", "--remove-orphans"],
    )
    .await;
}

/// compose 가 올린 서비스 중 publish 된 첫 포트를 upstream 으로 삼는다.
pub async fn published_port(project: &str) -> Result<Option<u16>, ProcessError> {
    let raw = process::output(
        "docker",
        ["compose", "--project-name", project, "ps", "--format", "{{.Publishers}}"],
    )
    .await?;

    Ok(parse_published(&raw))
}

fn parse_published(raw: &str) -> Option<u16> {
    raw.split(|c: char| !c.is_ascii_digit())
        .filter_map(|value| value.parse::<u16>().ok())
        .find(|port| *port >= 1024)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn picks_first_non_privileged_published_port() {
        assert_eq!(parse_published("[{0.0.0.0 20010 3000 tcp}]"), Some(20010));
    }

    #[test]
    fn ignores_empty_publishers() {
        assert_eq!(parse_published("[]"), None);
    }
}
