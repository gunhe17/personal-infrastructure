use contract::edge::RuleAction;

// #
// vhost

pub struct Vhost {
    pub host: String,
    /// 127.0.0.1 (리눅스) 또는 host.docker.internal (Mac)
    pub upstream_host: String,
    pub upstream_port: u16,
    pub path_prefix: String,
    pub tls: Option<TlsPaths>,
    pub rules: Vec<Rule>,
}

pub struct TlsPaths {
    pub certificate: String,
    pub key: String,
}

pub struct Rule {
    pub path_prefix: String,
    pub action: RuleAction,
    pub rate_limit: Option<i32>,
    pub cidrs: Vec<String>,
}

/// 우리가 쓴 파일임을 여는 줄에 박는다 — 없는 파일은 남의 것이라 만지지 않는다 [INV-10].
pub const MARKER: &str = "# pi:managed";

// #
// render

pub fn render(vhost: &Vhost) -> String {
    let mut out = String::new();

    out.push_str(MARKER);
    out.push_str(&format!(" host={}\n", vhost.host));

    // ACME HTTP-01 은 :80 에서 응답해야 한다 — TLS 로 넘기기 전에 challenge 를 먼저 잡는다
    out.push_str(&format!(
        "server {{\n    listen 80;\n    server_name {};\n\n    location /.well-known/acme-challenge/ {{\n        root /var/www/acme;\n    }}\n\n",
        vhost.host
    ));

    let Some(tls) = &vhost.tls else {
        out.push_str(&body(vhost));
        out.push_str("}\n");

        return out;
    };

    out.push_str("    location / {\n        return 301 https://$host$request_uri;\n    }\n}\n\n");
    out.push_str(&format!(
        "server {{\n    listen 443 ssl;\n    http2 on;\n    server_name {};\n\n    ssl_certificate {};\n    ssl_certificate_key {};\n\n",
        vhost.host, tls.certificate, tls.key
    ));
    out.push_str(&body(vhost));
    out.push_str("}\n");

    out
}

fn body(vhost: &Vhost) -> String {
    let mut out = String::new();

    for rule in &vhost.rules {
        match rule.action {
            RuleAction::Deny => out.push_str(&format!(
                "    location {} {{\n        return 403;\n    }}\n\n",
                rule.path_prefix
            )),
            RuleAction::Limit => out.push_str(&format!(
                "    location {} {{\n        limit_req zone=pi burst={};\n        proxy_pass http://{}:{};\n    }}\n\n",
                rule.path_prefix,
                rule.rate_limit.unwrap_or(10),
                vhost.upstream_host,
                vhost.upstream_port
            )),
            RuleAction::Allow => {
                let allowed: String = rule.cidrs.iter().map(|cidr| format!("        allow {cidr};\n")).collect();
                out.push_str(&format!(
                    "    location {} {{\n{allowed}        deny all;\n        proxy_pass http://{}:{};\n    }}\n\n",
                    rule.path_prefix, vhost.upstream_host, vhost.upstream_port
                ));
            }
        }
    }

    out.push_str(&format!(
        "    location {} {{\n        proxy_pass http://{}:{};\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }}\n",
        vhost.path_prefix, vhost.upstream_host, vhost.upstream_port
    ));

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn vhost(tls: Option<TlsPaths>) -> Vhost {
        Vhost {
            host: "app.example.com".into(),
            upstream_host: "127.0.0.1".into(),
            upstream_port: 20000,
            path_prefix: "/".into(),
            tls,
            rules: Vec::new(),
        }
    }

    #[test]
    fn plain_host_serves_on_80() {
        let rendered = render(&vhost(None));

        assert!(rendered.starts_with(MARKER));
        assert!(rendered.contains("listen 80;"));
        assert!(!rendered.contains("listen 443"));
        assert!(rendered.contains("proxy_pass http://127.0.0.1:20000;"));
    }

    #[test]
    fn tls_host_redirects_and_terminates() {
        let rendered = render(&vhost(Some(TlsPaths {
            certificate: "/certs/app.crt".into(),
            key: "/certs/app.key".into(),
        })));

        assert!(rendered.contains("return 301 https://$host$request_uri;"));
        assert!(rendered.contains("listen 443 ssl;"));
        assert!(rendered.contains("ssl_certificate /certs/app.crt;"));
    }

    #[test]
    fn allow_rule_lists_cidrs_then_denies() {
        let mut v = vhost(None);
        v.rules.push(Rule {
            path_prefix: "/admin".into(),
            action: RuleAction::Allow,
            rate_limit: None,
            cidrs: vec!["192.168.0.0/16".into()],
        });
        let rendered = render(&v);

        assert!(rendered.contains("location /admin {"));
        assert!(rendered.contains("allow 192.168.0.0/16;"));
        assert!(rendered.contains("deny all;"));
    }

    #[test]
    fn acme_challenge_stays_on_80_even_with_tls() {
        let rendered = render(&vhost(Some(TlsPaths {
            certificate: "/c".into(),
            key: "/k".into(),
        })));
        let http_block = rendered.split("listen 443").next().unwrap();

        assert!(http_block.contains("/.well-known/acme-challenge/"));
    }
}
