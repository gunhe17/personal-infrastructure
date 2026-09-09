import { SignInCard } from "@/ui";
import { signIn } from "@/lib/session";

/** 로그인 — 셸 밖의 화면. 사이드바 없이 카드 하나만 가운데. 토큰 하나로 들어온다. */
export function Login() {
  return (
    <div className="flex min-h-full items-center justify-center bg-bg p-6">
      <div className="w-full max-w-[400px]">
        <SignInCard onSubmit={(token) => { signIn(token); location.hash = "#home"; }} />
        <p className="mt-6 text-center text-caption text-mute">Run <span className="font-mono text-sub">pi token create</span> on the server to get one.</p>
      </div>
    </div>
  );
}
