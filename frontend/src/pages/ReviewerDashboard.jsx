import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gavel, Scale, CheckCircle2, Wallet, Undo2 } from "lucide-react";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api.js";
import { inr, errMsg } from "../utils/format.js";
import RoleLayout from "../components/RoleLayout.jsx";
import DashboardCard from "../components/DashboardCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

export default function ReviewerDashboard() {
  const { toast } = useToast();
  const [kpi, setKpi] = useState(null);
  const [disputes, setDisputes] = useState([]);

  useEffect(() => {
    Promise.all([api("/dashboard/reviewer"), api("/disputes")])
      .then(([k, d]) => { setKpi(k); setDisputes(d); })
      .catch((e) => toast(errMsg(e), "error"));
  }, []);

  return (
    <RoleLayout role="REVIEWER">
      <div className="max-w-5xl space-y-6">
        <h1 className="text-xl font-bold text-slate-800">Dispute Review Center</h1>
        <div className="grid grid-cols-5 gap-3">
          <DashboardCard icon={Gavel} label="Open Disputes" value={kpi?.open_disputes ?? "—"} tint="bg-reviewer-50 text-reviewer-600" />
          <DashboardCard icon={Scale} label="Resolved Cases" value={kpi?.resolved_cases ?? "—"} tint="bg-slate-100 text-slate-600" />
          <DashboardCard icon={Wallet} label="Released to Freelancer" value={inr((kpi?.released_inr || 0) / 250000)} tint="bg-emerald-50 text-emerald-600" />
          <DashboardCard icon={Undo2} label="Refunded to Client" value={inr((kpi?.refunded_inr || 0) / 250000)} tint="bg-amber-50 text-amber-600" />
          <DashboardCard icon={CheckCircle2} label="Total Cases" value={(kpi?.open_disputes || 0) + (kpi?.resolved_cases || 0)} tint="bg-client-50 text-client-600" />
        </div>
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold">All Disputes</h2></div>
          <table className="w-full">
            <thead><tr><th className="th">Project</th><th className="th">Reason</th><th className="th">Budget</th><th className="th">Status</th><th className="th" /></tr></thead>
            <tbody>
              {disputes.map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="td font-medium">{d.project_title}</td>
                  <td className="td max-w-xs truncate">{d.reason}</td>
                  <td className="td">{inr(d.budget_eth)}</td>
                  <td className="td"><StatusBadge status={d.status} /></td>
                  <td className="td text-right">
                    <Link to={`/reviewer/disputes/${d.id}`} className="btn-purple !py-1 !px-3 text-xs">
                      {d.status === "OPEN" ? "Review" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
              {disputes.length === 0 && <tr><td className="td text-slate-400" colSpan={5}>No disputes raised yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </RoleLayout>
  );
}
