// [토큰] 클래스 레시피 — 팝업 바탕/항목, 세그먼트 칸. 컴포넌트가 아니라 조합 문자열.


export const SEG = "relative z-10 inline-flex h-10 shrink-0 items-center gap-2 rounded-button px-5 text-body font-medium text-mute segment hover:text-text";
/** 작은 세그먼트 — 트랙 p-1 안에서 24 높이(2026-09-09 축소). 칸은 flex-1 로 같은 폭이라 좁은 열에서도 트랙 폭에 맞춘다(띠 안의 합·읽기·쓰기 토글). */
export const SEG_SM = "relative z-10 inline-flex h-4 flex-1 shrink-0 items-center justify-center gap-1 min-w-0 whitespace-nowrap rounded-[6px] px-2 text-[11px] leading-4 font-medium text-mute segment hover:text-text";

export const POPUP = "rounded-popup bg-popup p-1.5 outline-none ring-1 ring-line surface-2";

export const ITEM = "flex h-10 items-center rounded-control px-3 text-body text-text interactive";
