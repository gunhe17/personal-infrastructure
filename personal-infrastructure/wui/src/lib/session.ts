/**
 * 얇은 세션 — 아직 서버가 없어서 브라우저 안에서만 흉내 낸다.
 * 관리자 비밀번호는 **최초 1회** 설정하고, 그다음부터는 그것으로 들어온다.
 * 지금은 SHA-256 해시를 localStorage 에 둔다 — 진짜 검증은 서버가 해야 한다(API 붙이면 이 파일만 바꾼다).
 */
const ADMIN = "pi-admin", SESSION = "pi-session";
const get = (k: string, store: Storage) => { try { return store.getItem(k); } catch { return null; } };
const set = (k: string, v: string, store: Storage) => { try { store.setItem(k, v); } catch { /* 프라이빗 모드 */ } };

const hash = async (s: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

/** 관리자 비밀번호가 이미 있나 — 없으면 최초 설정 화면. */
export const adminSet = () => !!get(ADMIN, localStorage);
/** 최초 1회 설정. */
export const setupAdmin = async (password: string) => { set(ADMIN, await hash(password), localStorage); set(SESSION, "1", sessionStorage); };
/** 로그인 — 맞으면 세션을 연다. */
export const verify = async (password: string) => {
  const ok = get(ADMIN, localStorage) === (await hash(password));
  if (ok) set(SESSION, "1", sessionStorage);
  return ok;
};
export const signedIn = () => get(SESSION, sessionStorage) === "1";
/** 개발용 초기화 — 비밀번호를 잊었을 때 최초 설정으로 되돌린다. 서버가 붙으면 사라진다. */
export const resetAdmin = () => { try { localStorage.removeItem(ADMIN); sessionStorage.removeItem(SESSION); } catch { /* 무시 */ } };
export const signOut = () => { try { sessionStorage.removeItem(SESSION); } catch { /* 무시 */ } };
