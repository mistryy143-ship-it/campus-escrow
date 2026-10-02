import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderPlus, Lock, CheckCircle2, AlertTriangle, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api.js";
import { inr, errMsg } from "../utils/format.js";
import RoleLayout from "../components/RoleLayout.jsx";
import DashboardCard from "../components/DashboardCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

export default function ClientDashboard() {
  const { account } = useAuth();
  const { toast } = useToast();
  const [kpi, setKpi] = useState(null);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    Promise.all([
      api(`/dashboard/client/${account}`),
      api(`/projects?client=${account}`),
    ]).then(([k, p]) => { setKpi(k); setProjects(p); })
      .catch((e) => toast(errMsg(e), "error"));
  }, [account]);

  return (
    <RoleLayout role="CLIENT">
      <div className="max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <Link to="/client/create" className="btn-blue"><FolderPlus size={15} /> Create Project</Link>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <DashboardCard icon={Wallet} label="Total Projects" value={kpi?.total_projects ?? "—"} tint="bg-client-50 text-client-600" />
          <DashboardCard icon={Lock} label="Active Escrows" value={kpi?.active_escrows ?? "—"} tint="bg-amber-50 text-amber-600" />
          <DashboardCard icon={CheckCircle2} label="Pending Acceptance" value={kpi?.pending_acceptance ?? "—"} tint="bg-freelancer-50 text-freelancer-600" />
          <DashboardCard icon={AlertTriangle} label="Disputed" value={kpi?.disputed ?? "—"} tint="bg-red-50 text-red-600" />
          <DashboardCard icon={CheckCircle2} label="Released (₹)" value={inr((kpi?.released_inr || 0) / 250000)} tint="bg-emerald-50 text-emerald-600" />
        </div>
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold">My Projects</h2></div>
          <table className="w-full">
            <thead><tr><th className="th">Title</th><th className="th">Budget</th><th className="th">Deadline</th><th className="th">Status</th><th className="th" /></tr></thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="td font-medium">{p.title}</td>
                  <td className="td">{inr(p.budget_eth)}</td>
                  <td className="td text-xs">{new Date(p.deadline).toLocaleDateString("en-IN")}</td>
                  <td className="td"><StatusBadge status={p.status} /></td>
                  <td className="td text-right"><Link to={`/client/projects/${p.id}`} className="btn-outline !py-1 !px-3 text-xs">View</Link></td>
                </tr>
              ))}
              {projects.length === 0 && <tr><td className="td text-slate-400" colSpan={5}>No projects yet — create your first one.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </RoleLayout>
  );
}
