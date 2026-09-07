// [토큰] 상태 톤 — running·progress·failed·idle·info 가 어떤 색(점·글자·배지)으로 풀리는지. Dot·StatusDot·Badge·Notice·Toast 가 공유한다.
export type Tone = "running" | "progress" | "failed" | "idle" | "info";
export const TONE: Record<Tone, { dot: string; text: string; badge: string }> = {
  running: { dot: "bg-good", text: "text-text", badge: "bg-good text-ink" },
  progress: { dot: "bg-warn", text: "text-text", badge: "bg-warn text-ink" },
  failed: { dot: "bg-bad", text: "text-bad", badge: "bg-bad text-white" },
  idle: { dot: "bg-mute", text: "text-mute", badge: "bg-card-3 text-text" },
  info: { dot: "bg-info", text: "text-text", badge: "bg-info text-white" },
};

export function toneOf(status: string): Tone {
  if (["running", "routed", "succeeded", "ok", "up"].includes(status)) return "running";
  if (["deploying", "queued", "detecting", "building", "starting", "creating", "pending", "warning"].includes(status)) return "progress";
  if (["failed", "cancelled", "critical", "down"].includes(status)) return "failed";
  return "idle";
}
