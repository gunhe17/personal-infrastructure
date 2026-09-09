/** 아주 얇은 세션 — 아직 서버가 없어서 토큰 유무만 기억한다. 붙일 때 이 파일만 바꾼다. */
const KEY = "pi-token";
export const token = () => { try { return sessionStorage.getItem(KEY); } catch { return null; } };
export const signIn = (t: string) => { try { sessionStorage.setItem(KEY, t || "demo"); } catch { /* 사파리 프라이빗 */ } };
export const signOut = () => { try { sessionStorage.removeItem(KEY); } catch { /* 무시 */ } };
