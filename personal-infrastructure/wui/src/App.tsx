import { useEffect, useState } from "react";
import { Canvas } from "@/pages/Canvas";
import { Lab } from "@/pages/Lab";
import { StorageLab } from "@/pages/StorageLab";
import { LayoutLab } from "@/pages/LayoutLab";

// 대시보드 앱은 없다 — /ui 는 컴포넌트 캔버스, #lab · #storage · #layout 은 결정 전 후보를 보는 실험실.
export default function App() {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => { const on = () => setHash(location.hash); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  return hash === "#lab" ? <Lab /> : hash === "#storage" ? <StorageLab /> : hash === "#layout" ? <LayoutLab /> : <Canvas />;
}
