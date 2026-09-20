import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const HOME = { CLIENT: "/client/dashboard", FREELANCER: "/freelancer/dashboard", REVIEWER: "/reviewer/dashboard" };

export default function RoleGuard({ role, children }) {
  const { account, role: userRole } = useAuth();
  const location = useLocation();
  if (!account) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (role && userRole !== role) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 max-w-sm text-center">
          <ShieldAlert size={40} className="mx-auto text-red-500 mb-3" />
          <h2 className="font-bold text-lg text-slate-800">Access Denied</h2>
          <p className="text-sm text-slate-500 mt-1">
            This area is for <b>{role}</b> accounts. Your connected wallet is registered as <b>{userRole}</b>.
          </p>
          <a href={HOME[userRole] || "/login"} className="btn-blue mt-4">Go to my dashboard</a>
        </div>
      </div>
    );
  }
  return children;
}
