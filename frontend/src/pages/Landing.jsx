import { Link } from "react-router-dom";
import { ShieldCheck, FileCheck, Scale, ArrowRight, Lock } from "lucide-react";

const features = [
  { icon: Lock, title: "Secure Escrow", text: "Client funds are locked in a Solidity smart contract — released only on acceptance, resolution, or timeout." },
  { icon: FileCheck, title: "Verifiable Evidence", text: "Every deliverable is hashed with SHA-256 and anchored on-chain. Anyone can re-verify the file." },
  { icon: Scale, title: "Transparent Dispute Resolution", text: "A reviewer role investigates disputes and rules release or refund — every step lands in an audit trail." },
];

const steps = ["Client funds escrow", "Freelancer submits evidence", "Accept or dispute", "Reviewer resolves", "Release / Refund"];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <ShieldCheck className="text-client-600" size={22} /> CampusEscrow
          </div>
          <Link to="/login" className="btn-blue">Launch App <ArrowRight size={15} /></Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl font-extrabold text-slate-800">
            Verifiable Digital Escrow for Campus Freelance Projects
          </h1>
          <p className="mt-4 text-slate-500">
            Blockchain-held payments, SHA-256 proof of work, and transparent milestone disputes —
            with every state change mirrored into an auditable database.
          </p>
          <Link to="/login" className="btn-blue mt-8 !px-6 !py-3 text-base">Connect Wallet <ArrowRight size={16} /></Link>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-16">
          {features.map((f) => (
            <div key={f.title} className="card p-6">
              <f.icon size={26} className="text-client-600 mb-3" />
              <h3 className="font-bold text-slate-800">{f.title}</h3>
              <p className="text-sm text-slate-500 mt-2">{f.text}</p>
            </div>
          ))}
        </div>

        <div className="card p-6 mt-10">
          <h3 className="font-bold text-slate-800 mb-5 text-center">How it works</h3>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-slate-100 text-sm text-slate-700 font-medium">{s}</span>
                {i < steps.length - 1 && <ArrowRight size={14} className="text-slate-400" />}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
