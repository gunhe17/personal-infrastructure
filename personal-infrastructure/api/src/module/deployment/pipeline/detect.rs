use std::path::Path;
use std::path::PathBuf;

use crate::module::common::exception::DomainError;

// #
// stack

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Detected {
    pub stack: &'static str,
    pub port: u16,
    /// false 면 추측(3000) — 빌드 뒤 이미지의 EXPOSE 로 바로잡는다
    pub port_known: bool,
    /// 저장소에 Dockerfile 이 있으면 그것을, 없으면 우리가 써 준 것을 쓴다.
    pub dockerfile: Dockerfile,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Dockerfile {
    Existing(PathBuf),
    Generated(String),
    /// compose 파일은 우리가 고치지 않고 그대로 올린다.
    Compose(PathBuf),
}

// #
// detect

/// 설정 파일을 읽어 스택과 기본 포트를 정한다. Dockerfile 이 있으면 감지를 건너뛴다.
pub fn run(context: &Path) -> Result<Detected, DomainError> {
    // compose 가 먼저 — 여러 서비스를 한 번에 올리는 프로젝트다
    for candidate in [
        "compose.yaml",
        "compose.yml",
        "docker-compose.yml",
        "docker-compose.yaml",
    ] {
        let path = context.join(candidate);

        if path.is_file() {
            return Ok(Detected {
                stack: "compose",
                port: 0,
                port_known: false,
                dockerfile: Dockerfile::Compose(path),
            });
        }
    }

    let existing = context.join("Dockerfile");

    if existing.is_file() {
        // 포트는 Dockerfile 이 말한다 — EXPOSE 가 없으면 3000. 감사가 틀리면 알려준다
        let exposed = std::fs::read_to_string(&existing)
            .ok()
            .and_then(|body| exposed_port(&body));

        return Ok(Detected {
            stack: "dockerfile",
            port: exposed.unwrap_or(3000),
            port_known: exposed.is_some(),
            dockerfile: Dockerfile::Existing(existing),
        });
    }

    for (marker, detected) in candidates() {
        if context.join(marker).exists() {
            return Ok(detected);
        }
    }

    Err(DomainError::InvalidFormat { target: "Stack" })
}

/// `EXPOSE 8080` / `EXPOSE 80/tcp` — 첫 번째 것.
fn exposed_port(dockerfile: &str) -> Option<u16> {
    dockerfile.lines().find_map(|line| {
        let mut words = line.split_whitespace();

        if !words.next()?.eq_ignore_ascii_case("EXPOSE") {
            return None;
        }

        words.next()?.split('/').next()?.parse().ok()
    })
}

fn candidates() -> Vec<(&'static str, Detected)> {
    vec![
        ("package.json", generated("node", 3000, NODE)),
        ("Cargo.toml", generated("rust", 3000, RUST)),
        ("go.mod", generated("go", 8080, GO)),
        ("requirements.txt", generated("python", 8000, PYTHON)),
        ("index.html", generated("static", 80, STATIC)),
    ]
}

fn generated(stack: &'static str, port: u16, body: &str) -> Detected {
    Detected {
        stack,
        port,
        port_known: true,
        dockerfile: Dockerfile::Generated(body.to_owned()),
    }
}

const NODE: &str = r#"FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
"#;

const RUST: &str = r#"FROM rust:1-alpine AS build
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY . .
RUN cargo build --release

FROM alpine:3
WORKDIR /app
COPY --from=build /app/target/release/ /app/
EXPOSE 3000
CMD ["/bin/sh", "-c", "exec $(ls -1 /app | head -1)"]
"#;

const GO: &str = r#"FROM golang:1-alpine AS build
WORKDIR /app
COPY . .
RUN go build -o /app/server ./...

FROM alpine:3
COPY --from=build /app/server /server
EXPOSE 8080
CMD ["/server"]
"#;

const PYTHON: &str = r#"FROM python:3.12-alpine
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "main.py"]
"#;

const STATIC: &str = r#"FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dockerfile_wins_over_marker() {
        let dir = tempdir();
        std::fs::write(dir.join("package.json"), "{}").unwrap();
        std::fs::write(dir.join("Dockerfile"), "FROM scratch").unwrap();

        let detected = run(&dir).unwrap();

        assert_eq!(detected.stack, "dockerfile");
        assert!(matches!(detected.dockerfile, Dockerfile::Existing(_)));
    }

    #[test]
    fn compose_wins_over_dockerfile() {
        let dir = tempdir();
        std::fs::write(dir.join("Dockerfile"), "FROM scratch").unwrap();
        std::fs::write(dir.join("compose.yaml"), "services: {}").unwrap();

        let detected = run(&dir).unwrap();

        assert_eq!(detected.stack, "compose");
        assert!(matches!(detected.dockerfile, Dockerfile::Compose(_)));
    }

    #[test]
    fn dockerfile_port_comes_from_expose() {
        let dir = tempdir();
        std::fs::write(dir.join("Dockerfile"), "FROM nginx:alpine\nEXPOSE 80/tcp\n").unwrap();

        assert_eq!(run(&dir).unwrap().port, 80);
        assert_eq!(exposed_port("FROM x\nexpose 8080\n"), Some(8080));
        assert_eq!(exposed_port("FROM x\n"), None);
    }

    #[test]
    fn detects_node_by_marker() {
        let dir = tempdir();
        std::fs::write(dir.join("package.json"), "{}").unwrap();

        let detected = run(&dir).unwrap();

        assert_eq!(detected.stack, "node");
        assert_eq!(detected.port, 3000);
    }

    #[test]
    fn unknown_stack_is_rejected() {
        let dir = tempdir();

        assert!(run(&dir).is_err());
    }

    fn tempdir() -> PathBuf {
        let path = std::env::temp_dir().join(format!("pi-detect-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&path).unwrap();

        path
    }
}
