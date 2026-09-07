use std::ffi::OsStr;
use std::path::Path;
use std::process::Stdio;

use tokio::io::AsyncBufReadExt;
use tokio::io::AsyncWriteExt;
use tokio::io::BufReader;
use tokio::process::Command;

// #
// exception

#[derive(thiserror::Error, Debug)]
#[error("{program} 실패 (원인: {reason})")]
pub struct ProcessError {
    pub program: &'static str,
    pub reason: String,
}

fn fail(program: &'static str, reason: impl ToString) -> ProcessError {
    ProcessError {
        program,
        reason: reason.to_string(),
    }
}

fn command<S: AsRef<OsStr>>(
    program: &'static str,
    args: impl IntoIterator<Item = S>,
    dir: Option<&Path>,
) -> Command {
    let mut command = Command::new(program);
    command.args(args);

    if let Some(dir) = dir {
        command.current_dir(dir);
    }

    command
}

// #
// output

/// stdout 을 돌려준다. 실패하면 stderr 가 원인이 된다.
pub async fn output<S: AsRef<OsStr>>(
    program: &'static str,
    args: impl IntoIterator<Item = S>,
) -> Result<String, ProcessError> {
    let bytes = output_bytes_in(program, args, None).await?;

    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

pub async fn output_in<S: AsRef<OsStr>>(
    dir: &Path,
    program: &'static str,
    args: impl IntoIterator<Item = S>,
) -> Result<String, ProcessError> {
    let bytes = output_bytes_in(program, args, Some(dir)).await?;

    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

/// 덤프처럼 큰 이진 출력.
pub async fn output_bytes<S: AsRef<OsStr>>(
    program: &'static str,
    args: impl IntoIterator<Item = S>,
) -> Result<Vec<u8>, ProcessError> {
    output_bytes_in(program, args, None).await
}

async fn output_bytes_in<S: AsRef<OsStr>>(
    program: &'static str,
    args: impl IntoIterator<Item = S>,
    dir: Option<&Path>,
) -> Result<Vec<u8>, ProcessError> {
    let produced = command(program, args, dir)
        .output()
        .await
        .map_err(|error| fail(program, error))?;

    if !produced.status.success() {
        return Err(fail(program, String::from_utf8_lossy(&produced.stderr).trim()));
    }

    Ok(produced.stdout)
}

// #
// input

/// stdin 을 흘려 넣는다 — 복원이 이걸 탄다.
pub async fn input<S: AsRef<OsStr>>(
    program: &'static str,
    args: impl IntoIterator<Item = S>,
    stdin: &[u8],
) -> Result<(), ProcessError> {
    let mut child = command(program, args, None)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| fail(program, error))?;

    if let Some(mut pipe) = child.stdin.take() {
        pipe.write_all(stdin).await.ok();
        pipe.shutdown().await.ok();
    }

    let produced = child
        .wait_with_output()
        .await
        .map_err(|error| fail(program, error))?;

    if !produced.status.success() {
        return Err(fail(program, String::from_utf8_lossy(&produced.stderr).trim()));
    }

    Ok(())
}

// #
// stream

/// 한 줄마다 `on_line`. stdout·stderr 둘 다 읽는다 — 한쪽만 읽으면 파이프가 막힌다.
pub async fn stream<S, F, Fut>(
    program: &'static str,
    args: impl IntoIterator<Item = S>,
    mut on_line: F,
) -> Result<(), ProcessError>
where
    S: AsRef<OsStr>,
    F: FnMut(String) -> Fut,
    Fut: Future<Output = ()>,
{
    let mut child = command(program, args, None)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| fail(program, error))?;

    let stdout = child.stdout.take().expect("piped");
    let stderr = child.stderr.take().expect("piped");

    let (sender, mut receiver) = tokio::sync::mpsc::channel::<String>(256);
    forward(stdout, sender.clone());
    forward(stderr, sender);

    while let Some(line) = receiver.recv().await {
        on_line(line).await;
    }

    let status = child.wait().await.map_err(|error| fail(program, error))?;

    if !status.success() {
        return Err(fail(program, format!("exit {}", status.code().unwrap_or(-1))));
    }

    Ok(())
}

fn forward<R>(reader: R, sender: tokio::sync::mpsc::Sender<String>)
where
    R: tokio::io::AsyncRead + Unpin + Send + 'static,
{
    tokio::spawn(async move {
        let mut lines = BufReader::new(reader).lines();

        while let Ok(Some(line)) = lines.next_line().await {
            if sender.send(line).await.is_err() {
                break;
            }
        }
    });
}
