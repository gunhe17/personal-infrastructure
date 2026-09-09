import { useEffect, useState } from "react";
import { Canvas } from "@/pages/Canvas";
import { Lab } from "@/pages/Lab";
import { StorageLab } from "@/pages/StorageLab";
import { LayoutLab } from "@/pages/LayoutLab";
import { Login } from "@/pages/Login";
import { Home } from "@/pages/Home";
import { signedIn } from "@/lib/session";

// /ui 는 컴포넌트 캔버스, #lab · #storage · #layout 은 실험실, #login · #home 은 실제 앱.
export default function App() {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => { const on = () => setHash(location.hash); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  // 실제 앱은 #login → #home. 토큰이 없으면 로그인으로 되돌린다. /ui 기본은 아직 컴포넌트 캔버스.
  if (hash === "#login") return <Login />;
  if (hash === "#home") return signedIn() ? <Home /> : <Login />;
  return hash === "#lab" ? <Lab /> : hash === "#storage" ? <StorageLab /> : hash === "#layout" ? <LayoutLab /> : <Canvas />;
}
