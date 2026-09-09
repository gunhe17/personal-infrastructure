/** 용량 서식 — 1000 GB 위는 TB, 10 GB 아래는 소수 한 자리. 목록·그래프가 같은 문법을 쓴다. */
export const formatGB = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} TB` : v >= 10 ? `${Math.round(v)} GB` : `${v.toFixed(1)} GB`);
/** 눈금용 짧은 서식 — 36px 열에서 접히지 않게 단위 한 글자. */
export const formatGBShort = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}T` : `${Math.round(v)}G`);
