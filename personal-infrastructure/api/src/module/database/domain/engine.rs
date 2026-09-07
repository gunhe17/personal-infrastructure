use contract::database::Engine;

// #
// spec

/// 엔진마다 이미지·기본 포트·비밀값 주입 방식이 다르다. 그 차이를 여기 한 곳에 모은다.
pub struct Spec {
    pub image: String,
    pub container_port: u16,
    pub env: Vec<(String, String)>,
    pub data_path: &'static str,
    pub url_scheme: &'static str,
    pub args: Vec<String>,
}

pub fn spec(engine: Engine, version: &str, username: &str, password: &str, database: &str) -> Spec {
    match engine {
        Engine::Postgres => Spec {
            image: format!("postgres:{version}-alpine"),
            container_port: 5432,
            env: vec![
                ("POSTGRES_USER".into(), username.into()),
                ("POSTGRES_PASSWORD".into(), password.into()),
                ("POSTGRES_DB".into(), database.into()),
            ],
            data_path: "/var/lib/postgresql/data",
            url_scheme: "postgres",
            args: Vec::new(),
        },
        Engine::Mysql => Spec {
            image: format!("mysql:{version}"),
            container_port: 3306,
            env: vec![
                ("MYSQL_ROOT_PASSWORD".into(), password.into()),
                ("MYSQL_USER".into(), username.into()),
                ("MYSQL_PASSWORD".into(), password.into()),
                ("MYSQL_DATABASE".into(), database.into()),
            ],
            data_path: "/var/lib/mysql",
            url_scheme: "mysql",
            args: Vec::new(),
        },
        Engine::Redis => Spec {
            image: format!("redis:{version}-alpine"),
            container_port: 6379,
            env: Vec::new(),
            data_path: "/data",
            url_scheme: "redis",
            args: Vec::new(),
        },
        Engine::Mongo => Spec {
            image: format!("mongo:{version}"),
            container_port: 27017,
            env: vec![
                ("MONGO_INITDB_ROOT_USERNAME".into(), username.into()),
                ("MONGO_INITDB_ROOT_PASSWORD".into(), password.into()),
                ("MONGO_INITDB_DATABASE".into(), database.into()),
            ],
            data_path: "/data/db",
            url_scheme: "mongodb",
            args: Vec::new(),
        },
        // 카탈로그 항목 — DB 는 아니지만 "포트 하나·볼륨 하나·비밀값 env" 라는 모양이 같다
        Engine::Minio => Spec {
            image: format!("minio/minio:{version}"),
            container_port: 9000,
            env: vec![
                ("MINIO_ROOT_USER".into(), username.into()),
                ("MINIO_ROOT_PASSWORD".into(), password.into()),
            ],
            data_path: "/data",
            url_scheme: "s3",
            args: vec!["server".into(), "/data".into()],
        },
    }
}

/// 카탈로그 — `pi database engines`.
pub fn catalog() -> Vec<contract::database::EngineInfo> {
    [Engine::Postgres, Engine::Mysql, Engine::Redis, Engine::Mongo, Engine::Minio]
        .into_iter()
        .map(|engine| {
            let version = default_version(engine);
            let described = spec(engine, version, "u", "p", "d");

            contract::database::EngineInfo {
                engine,
                image: described.image,
                default_version: version.to_owned(),
                description: match engine {
                    Engine::Postgres => "관계형 DB. 기본 선택",
                    Engine::Mysql => "관계형 DB. MySQL 8",
                    Engine::Redis => "캐시·큐. 비밀번호 없음",
                    Engine::Mongo => "문서 DB",
                    Engine::Minio => "S3 호환 오브젝트 스토리지. url 의 user/password 가 access/secret key",
                }
                .to_owned(),
            }
        })
        .collect()
}

pub fn default_version(engine: Engine) -> &'static str {
    match engine {
        Engine::Postgres => "16",
        Engine::Mysql => "8",
        Engine::Redis => "7",
        Engine::Mongo => "7",
        Engine::Minio => "latest",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redis_takes_no_credentials() {
        let spec = spec(Engine::Redis, "7", "u", "p", "d");

        assert!(spec.env.is_empty());
        assert_eq!(spec.container_port, 6379);
    }

    #[test]
    fn postgres_injects_credentials() {
        let spec = spec(Engine::Postgres, "16", "u", "p", "d");

        assert!(
            spec.env
                .iter()
                .any(|(k, v)| k == "POSTGRES_PASSWORD" && v == "p")
        );
        assert_eq!(spec.image, "postgres:16-alpine");
    }
}
