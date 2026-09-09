// [유기체] SignInCard = Card + Field(Input) + Button. 관리자 비밀번호로 들어오는 로그인·최초 설정.
import { useState } from "react";
import { Button } from "@/ui/1-atoms/button";
import { Card } from "@/ui/1-atoms/card";
import { Input } from "@/ui/1-atoms/input";
import { Field } from "@/ui/2-molecules/field";

/**
 * [유기체] SignInCard — `mode="setup"` 이면 최초 1회 비밀번호 설정(새 비밀번호 + 확인),
 * `mode="signin"` 이면 그 비밀번호로 로그인(사용자 결정 2026-09-09: 토큰 → 관리자 비밀번호).
 * 맞지 않음·짧음 같은 입력 검사는 카드가 하고, 통과한 값만 밖으로 준다.
 */
export function SignInCard({ mode = "signin", minLength = 8, onSubmit, busy, error, className }: {
  mode?: "signin" | "setup";
  minLength?: number;
  onSubmit: (password: string) => void;
  busy?: boolean;
  error?: string;
  className?: string;
}) {
  const setup = mode === "setup";
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [local, setLocal] = useState<string | undefined>();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (setup && pw.length < minLength) return setLocal(`Use ${minLength} characters or more`);
    if (setup && pw !== again) return setLocal("The two entries do not match");
    setLocal(undefined);
    onSubmit(pw);
  };
  return (
    <Card className={className} title={setup ? "Set an admin password" : "Sign in"} subtitle={setup ? "First run — this password opens the dashboard from now on" : "Enter the admin password"}>
      <form className="space-y-4" onSubmit={submit}>
        <Field label={setup ? "New password" : "Password"} error={setup ? local : (local ?? error)} hint={setup ? `${minLength} characters or more` : undefined}>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={setup ? "new-password" : "current-password"} autoFocus />
        </Field>
        {setup && <Field label="Confirm password"><Input type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" /></Field>}
        {!setup && error && !local && <span className="sr-only">{error}</span>}
        <Button type="submit" variant="primary" busy={busy} className="w-full">{setup ? "Create" : "Continue"}</Button>
      </form>
    </Card>
  );
}
