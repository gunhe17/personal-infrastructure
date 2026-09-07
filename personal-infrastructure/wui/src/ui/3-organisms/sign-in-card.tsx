// [유기체] SignInCard = Card + Field(Input) + Button. 부트스트랩 토큰 하나로 들어오는 로그인.
import { useState } from "react";
import { Button } from "@/ui/1-atoms/button";
import { Card } from "@/ui/1-atoms/card";
import { Input } from "@/ui/1-atoms/input";
import { Field } from "@/ui/2-molecules/field";

export function SignInCard({ onSubmit, busy, error, className }: { onSubmit: (token: string) => void; busy?: boolean; error?: string; className?: string }) {
  const [token, setToken] = useState("");
  return (
    <Card className={className} title="로그인" subtitle="서버가 만든 토큰을 붙여 넣는다">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(token); }}>
        <Field label="토큰" error={error} hint="pi token create 로 만든 값"><Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="pi_…" autoComplete="current-password" /></Field>
        <Button type="submit" variant="primary" busy={busy} className="w-full">들어가기</Button>
      </form>
    </Card>
  );
}
