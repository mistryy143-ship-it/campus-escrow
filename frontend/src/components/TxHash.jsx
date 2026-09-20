import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function TxHash({ hash }) {
  const [copied, setCopied] = useState(false);
  if (!hash) return <span className="text-slate-400 text-xs">—</span>;
  const copy = async () => {
    try { await navigator.clipboard.writeText(hash); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="inline-flex items-center gap-1 font-mono text-xs text-slate-500 hover:text-slate-800" title={hash}>
      {hash.slice(0, 10)}…{hash.slice(-4)}
      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
    </button>
  );
}
