// [유기체] SignInCard = Card + Field(Input) + Button. 부트스트랩 토큰 하나로 들어오는 로그인.
import { useState } from "react";
import { Button } from "@/ui/1-atoms/button";
import { Card } from "@/ui/1-atoms/card";
import { Input } from "@/ui/1-atoms/input";
import { Field } from "@/ui/2-molecules/field";

export function SignInCard({ onSubmit, busy, error, className }: { onSubmit: (token: string) => void; busy?: boolean; error?: string; className?: string }) {
  const [token, setToken] = useState("");
  return (
    <Card className={className} title="Sign in" subtitle="Paste the token this server created">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(token); }}>
        <Field label="Token" error={error} hint="From pi token create"><Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="pi_…" autoComplete="current-password" /></Field>
        <Button type="submit" variant="primary" busy={busy} className="w-full">Continue</Button>
      </form>
    </Card>
  );
}
