import { useState } from "react";
import { SignInCard } from "@/ui";
import { Button } from "@/ui";
import { adminSet, resetAdmin, setupAdmin, verify } from "@/lib/session";

/** 로그인 — 셸 밖의 화면. 최초 실행이면 비밀번호를 정하고, 그다음부터는 그것으로 들어온다. */
export function Login() {
  const setup = !adminSet();
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const go = async (password: string) => {
    setBusy(true);
    try {
      if (setup) await setupAdmin(password);
      else if (!(await verify(password))) { setError("Wrong password"); return; }
      location.hash = "#home";
    } finally { setBusy(false); }
  };
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
      <div className="w-full max-w-[400px]">
        <SignInCard mode={setup ? "setup" : "signin"} onSubmit={go} busy={busy} error={error} />
        {/* 개발용 인증 — 서버가 없어서 이 브라우저 안에서만 산다. 잠기지 않도록 초기화를 열어 둔다. */}
        <p className="mt-6 text-center text-caption text-mute">Dev auth — kept in this browser only.</p>
        {!setup && (
          <div className="mt-2 flex justify-center">
            <Button size="sm" variant="ghost" onClick={() => { resetAdmin(); setError(undefined); location.reload(); }}>Reset password</Button>
          </div>
        )}
      </div>
    </div>
  );
}
