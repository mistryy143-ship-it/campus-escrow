import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Hammer, Hourglass, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api.js";
import { inr, errMsg } from "../utils/format.js";
import RoleLayout from "../components/RoleLayout.jsx";
import DashboardCard from "../components/DashboardCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

export default function FreelancerDashboard() {
  const { account } = useAuth();
  const { toast } = useToast();
  const [kpi, setKpi] = useState(null);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    Promise.all([
      api(`/dashboard/freelancer/${account}`),
      api(`/projects?freelancer=${account}`),
    ]).then(([k, p]) => { setKpi(k); setProjects(p); })
      .catch((e) => toast(errMsg(e), "error"));
  }, [account]);

  return (
    <RoleLayout role="FREELANCER">
      <div className="max-w-5xl space-y-6">
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <div className="grid grid-cols-5 gap-3">
          <DashboardCard icon={Briefcase} label="Assigned Projects" value={kpi?.assigned_projects ?? "—"} tint="bg-freelancer-50 text-freelancer-600" />
          <DashboardCard icon={Hammer} label="Active Work" value={kpi?.active_work ?? "—"} tint="bg-amber-50 text-amber-600" />
          <DashboardCard icon={Hourglass} label="Under Review" value={kpi?.under_review ?? "—"} tint="bg-client-50 text-client-600" />
          <DashboardCard icon={AlertTriangle} label="Disputed" value={kpi?.disputed ?? "—"} tint="bg-red-50 text-red-600" />
          <DashboardCard icon={CheckCircle2} label="Earned (₹)" value={inr((kpi?.earned_inr || 0) / 250000)} tint="bg-emerald-50 text-emerald-600" />
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
                  <td className="td text-right"><Link to={`/freelancer/projects/${p.id}`} className="btn-green !py-1 !px-3 text-xs">Open</Link></td>
                </tr>
              ))}
              {projects.length === 0 && <tr><td className="td text-slate-400" colSpan={5}>No projects assigned to you yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </RoleLayout>
  );
}
