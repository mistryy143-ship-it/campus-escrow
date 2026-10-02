import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  LayoutDashboard, FolderPlus, Activity, Wallet,
  ShieldCheck, LogOut,
} from "lucide-react";
import { shortAddr } from "../utils/format.js";

const THEME = {
  CLIENT: {
    sidebar: "bg-client-700", active: "bg-client-500/40", title: "Client Portal", inr: "₹75,000",
    items: [
      { to: "/client/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/client/create", icon: FolderPlus, label: "Create Project" },
      { to: "/audit", icon: Activity, label: "Audit Explorer" },
    ],
  },
  FREELANCER: {
    sidebar: "bg-freelancer-700", active: "bg-freelancer-500/40", title: "Freelancer Portal", inr: "₹25,000",
    items: [
      { to: "/freelancer/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/audit", icon: Activity, label: "Audit Explorer" },
    ],
  },
  REVIEWER: {
    sidebar: "bg-reviewer-700", active: "bg-reviewer-500/40", title: "Dispute Review Center", inr: "₹0",
    items: [
      { to: "/reviewer/dashboard", icon: LayoutDashboard, label: "Open Disputes" },
      { to: "/audit", icon: Activity, label: "Audit Explorer" },
    ],
  },
};

export default function RoleLayout({ role, children }) {
  const { account, logout } = useAuth();
  const navigate = useNavigate();
  const t = THEME[role] || THEME.CLIENT;

  const doLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="min-h-screen flex">
      <aside className={`w-60 ${t.sidebar} text-white flex flex-col shrink-0`}>
        <div className="px-5 py-5 flex items-center gap-2 border-b border-white/10">
          <ShieldCheck size={22} />
          <div>
            <p className="font-bold leading-tight">CampusEscrow</p>
            <p className="text-xs text-white/70">{t.title}</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {t.items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition ${isActive ? t.active + " font-semibold" : "text-white/80 hover:bg-white/10"}`
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Wallet size={15} className="text-white/70" />
            <div className="min-w-0">
              <p className="font-mono text-xs truncate">{shortAddr(account)}</p>
              <p className="text-xs text-emerald-300 font-semibold">{t.inr} INR</p>
            </div>
          </div>
          <button onClick={doLogout} className="flex items-center gap-2 text-xs text-white/70 hover:text-white">
            <LogOut size={14} /> Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
