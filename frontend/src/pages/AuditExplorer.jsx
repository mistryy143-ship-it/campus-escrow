import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api.js";
import { errMsg, fmtTime } from "../utils/format.js";
import RoleLayout from "../components/RoleLayout.jsx";
import TxHash from "../components/TxHash.jsx";

export default function AuditExplorer() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    api("/audit").then(setLogs).catch((e) => toast(errMsg(e), "error"));
  }, []);

  const rows = logs.filter((l) =>
    !filter ||
    (l.project_title || "").toLowerCase().includes(filter.toLowerCase()) ||
    (l.event_type || "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <RoleLayout role={role}>
      <div className="max-w-5xl space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Audit Explorer</h1>
          <input placeholder="Filter by project or event…" className="input !w-64" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr><th className="th">Time</th><th className="th">Project</th><th className="th">Event</th><th className="th">Transition</th><th className="th">Transaction</th></tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="td text-xs whitespace-nowrap">{fmtTime(l.created_at)}</td>
                  <td className="td font-medium">{l.project_title || `#${l.project_id}`}</td>
                  <td className="td text-xs">{l.event_type}</td>
                  <td className="td text-xs">{l.old_status && l.new_status ? `${l.old_status} → ${l.new_status}` : "—"}</td>
                  <td className="td"><TxHash hash={l.transaction_hash} /></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td className="td text-slate-400" colSpan={5}>No audit events.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </RoleLayout>
  );
}
