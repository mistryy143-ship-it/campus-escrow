import { useEffect, useState } from "react";

export default function Countdown({ deadline }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = new Date(deadline).getTime() - now;
  if (Number.isNaN(diff)) return <span className="text-sm text-slate-400">—</span>;
  if (diff <= 0) return <span className="text-sm font-medium text-red-600">Deadline passed</span>;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff / 60_000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  return <span className="text-sm text-slate-600">{h}h {m}m {s}s remaining</span>;
}
