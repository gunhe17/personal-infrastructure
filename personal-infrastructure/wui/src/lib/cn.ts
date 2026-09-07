/** 클래스 이어붙이기 — falsy 는 버린다. tailwind-merge 는 충돌이 생길 때 붙인다. */
export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
