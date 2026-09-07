use std::sync::atomic::AtomicBool;
use std::sync::atomic::Ordering;

use serde::Serialize;

static JSON: AtomicBool = AtomicBool::new(false);

// #
// mode

pub fn set_json(enabled: bool) {
    JSON.store(enabled, Ordering::Relaxed);
}

pub fn is_json() -> bool {
    JSON.load(Ordering::Relaxed)
}

// #
// render

/// --json 이면 순수 JSON 만 stdout 으로. 진단은 stderr 로 간다.
pub fn json<T: Serialize>(value: &T) -> anyhow::Result<()> {
    println!("{}", serde_json::to_string_pretty(value)?);

    Ok(())
}

pub fn table(headers: &[&str], rows: &[Vec<String>]) {
    let mut widths: Vec<usize> = headers.iter().map(|h| h.chars().count()).collect();

    for row in rows {
        for (index, cell) in row.iter().enumerate() {
            let width = cell.chars().count();

            if width > widths[index] {
                widths[index] = width;
            }
        }
    }

    let line = |cells: &[String]| {
        let rendered: Vec<String> = cells
            .iter()
            .enumerate()
            .map(|(index, cell)| pad(cell, widths[index]))
            .collect();

        println!("{}", rendered.join("  ").trim_end());
    };

    line(&headers.iter().map(|h| h.to_string()).collect::<Vec<_>>());

    for row in rows {
        line(row);
    }
}

pub fn record(fields: &[(&str, String)]) {
    let width = fields
        .iter()
        .map(|(k, _)| k.chars().count())
        .max()
        .unwrap_or(0);

    for (key, value) in fields {
        if value.is_empty() {
            continue;
        }

        println!("{}  {value}", pad(key, width));
    }
}

pub fn info(message: &str) {
    eprintln!("{message}");
}

fn pad(value: &str, width: usize) -> String {
    format!("{value:<width$}")
}
