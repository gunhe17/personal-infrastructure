// [토큰] 순위 색 — 색이 종류가 아니라 순위를 말한다(사용자 결정 2026-09-09).
// 현재값(=전체)만 쨍한 파랑, 상위 1·2·3 은 무채색에 가까운 파랑에서 점점 옅게.
export const NOW = "var(--now)";
export const RANK = ["var(--rank-1)", "var(--rank-2)", "var(--rank-3)"];
export const rankColor = (i: number) => RANK[i % RANK.length];

/** 사용률(%) → 상태 톤. 60 넘으면 주의, 80 넘으면 경고. 숫자·막대·그래프가 이 하나를 같이 쓴다. */
export type UsageTone = "accent" | "warn" | "bad";
export const usageTone = (pct: number): UsageTone => (pct > 80 ? "bad" : pct > 60 ? "warn" : "accent");
export const USAGE_COLOR: Record<UsageTone, string> = { accent: NOW, warn: "var(--warn)", bad: "var(--bad)" };
export const usageColor = (pct: number) => USAGE_COLOR[usageTone(pct)];
