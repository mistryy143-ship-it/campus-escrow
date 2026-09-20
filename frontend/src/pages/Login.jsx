import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Briefcase, Code2, Gavel, ShieldCheck, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { errMsg } from "../utils/format.js";

const ROLES = [
  { key: "CLIENT", icon: Briefcase, title: "Client", desc: "Create projects, fund escrow, accept work", color: "border-client-500 bg-client-50", iconColor: "text-client-600" },
  { key: "FREELANCER", icon: Code2, title: "Freelancer", desc: "Submit milestone proof and get paid", color: "border-freelancer-500 bg-freelancer-50", iconColor: "text-freelancer-600" },
  { key: "REVIEWER", icon: Gavel, title: "Dispute Reviewer", desc: "Verify evidence and resolve disputes", color: "border-reviewer-500 bg-reviewer-50", iconColor: "text-reviewer-600" },
];

const HOME = { CLIENT: "/client/dashboard", FREELANCER: "/freelancer/dashboard", REVIEWER: "/reviewer/dashboard" };

export default function Login() {
  const [selected, setSelected] = useState("CLIENT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { connect } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleConnect = async () => {
    setBusy(true); setError("");
    try {
      const role = await connect(selected);
      const dest = location.state?.from && location.state.from.startsWith(HOME[role])
        ? location.state.from : HOME[role];
      navigate(dest, { replace: true });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-800">
            <ShieldCheck className="text-client-600" size={22} /> CampusEscrow
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <h1 className="text-2xl font-bold text-slate-800 text-center">Sign in with your wallet</h1>
          <p className="text-sm text-slate-500 text-center mt-1 mb-6">
            Choose your role, then connect MetaMask. The app switches you to the Hardhat Local network automatically.
          </p>
          <div className="grid gap-3">
            {ROLES.map((r) => (
              <button
                key={r.key}
                onClick={() => setSelected(r.key)}
                className={`card p-4 flex items-center gap-4 text-left border-2 transition ${
                  selected === r.key ? r.color : "border-transparent hover:border-slate-300"
                }`}
              >
                <r.icon size={26} className={r.iconColor} />
                <div>
                  <p className="font-semibold text-slate-800">{r.title}</p>
                  <p className="text-xs text-slate-500">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <button onClick={handleConnect} disabled={busy} className="btn-blue w-full justify-center mt-6 !py-3">
            {busy ? "Connecting…" : <>Connect MetaMask as {selected} <ArrowRight size={15} /></>}
          </button>
          {error && <p className="text-sm text-red-600 text-center mt-3">{error}</p>}
          <p className="text-xs text-slate-400 text-center mt-4">
            Demo wallets: import Hardhat accounts #0 (client), #1 (freelancer), #2 (reviewer) into MetaMask.
          </p>
        </div>
      </main>
    </div>
  );
}
