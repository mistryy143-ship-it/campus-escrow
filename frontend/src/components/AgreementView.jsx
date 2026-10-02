import { useCallback, useEffect, useState } from "react";
import { Contract } from "ethers";
import { Wallet, Lock, CheckCircle2, Activity, RefreshCw, Upload, FileCheck, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api.js";
import { inr, errMsg, sameAddr, sha256File, sha256Text, sha256Hex, fmtTime } from "../utils/format.js";
import StatusBadge from "./StatusBadge.jsx";
import DashboardCard from "./DashboardCard.jsx";
import Countdown from "./Countdown.jsx";
import AuditTimeline from "./AuditTimeline.jsx";
import TxHash from "./TxHash.jsx";

const CHAIN_STATUSES = ["CREATED","FUNDED","MILESTONE_SUBMITTED","ACCEPTED","DISPUTED","RESOLVED","TIMED_OUT","RELEASED","REFUNDED"];

export default function AgreementView({ projectId, mode }) {
  const { account, signer, contractInfo } = useAuth();
  const { toast } = useToast();
  const [p, setP] = useState(null);
  const [audit, setAudit] = useState([]);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [chainStatus, setChainStatus] = useState(null);
  const [verify, setVerify] = useState({});

  const load = useCallback(async () => {
    const [proj, au] = await Promise.all([
      api(`/projects/${projectId}`),
      api(`/projects/${projectId}/audit`),
    ]);
    setP(proj);
    setAudit(au);
  }, [projectId]);

  useEffect(() => { load().catch((e) => toast(errMsg(e), "error")); }, [load]);

  if (!p) return <p className="text-slate-500">Loading project…</p>;

  const chainId = p.blockchain_agreement_id;
  const status = p.status;
  const deadlinePassed = new Date(p.deadline).getTime() < Date.now();
  const isClient = mode === "client" && sameAddr(account, p.client_wallet);
  const isFreelancer = mode === "freelancer" && sameAddr(account, p.freelancer_wallet);
  const ended = ["RELEASED", "REFUNDED", "ACCEPTED", "RESOLVED", "TIMED_OUT"].includes(status);

  const getContract = () => new Contract(contractInfo.address, contractInfo.abi, signer);

  const guard = () => {
    if (!signer || !contractInfo) { toast("Connect your wallet first.", "error"); return false; }
    if (chainId === null || chainId === undefined) {
      toast("This project is not linked to an on-chain agreement.", "error"); return false;
    }
    return true;
  };

  const runTx = async (fn, successMsg) => {
    if (!guard()) return;
    setBusy(true);
    try {
      await fn();
      toast(successMsg, "success");
      await new Promise((r) => setTimeout(r, 2500)); // let the listener sync first
      await load();
    } catch (e) {
      console.error(e);
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitEvidence = () =>
    runTx(async () => {
      const hash = file ? await sha256File(file) : await sha256Text(text || "milestone-complete");
      const fd = new FormData();
      fd.append("hash", hash);
      if (file) fd.append("evidence", file);
      else { fd.append("fileName", "text-submission"); fd.append("text", text || "milestone-complete"); }
      await api(`/projects/${projectId}/evidence`, { method: "POST", wallet: account, formData: fd });
      const tx = await getContract().submitMilestone(chainId, hash);
      await tx.wait();
    }, "Milestone submitted on-chain.");

  const handleAccept = () =>
    runTx(async () => {
      const tx = await getContract().accept(chainId);
      await tx.wait();
    }, "Funds released to the freelancer.");

  const handleDispute = () =>
    runTx(async () => {
      const r = reason.trim();
      const tx = await getContract().raiseDispute(chainId, r);
      await tx.wait();
      await api(`/projects/${projectId}/dispute`, { method: "POST", wallet: account, body: { reason: r } });
      setReason(""); setShowDispute(false);
    }, "Dispute raised. A reviewer will resolve it.");

  const handleTimeout = () =>
    runTx(async () => {
      const tx = await getContract().checkTimeout(chainId);
      await tx.wait();
    }, "Deadline passed — escrow refunded to client.");

  const readChain = async () => {
    if (!guard()) return;
    try {
      const a = await getContract().getAgreement(chainId);
      setChainStatus(CHAIN_STATUSES[Number(a.status)]);
    } catch (e) { toast(errMsg(e), "error"); }
  };

  const verifyEvidence = async (ev) => {
    try {
      const res = await fetch(ev.file_path);
      const buf = await res.arrayBuffer();
      const h = await sha256Hex(buf);
      setVerify((v) => ({ ...v, [ev.id]: h === ev.file_hash }));
    } catch {
      setVerify((v) => ({ ...v, [ev.id]: false }));
    }
  };

  const canSubmit = isFreelancer && status === "FUNDED";
  const canAccept = isClient && status === "MILESTONE_SUBMITTED";
  const canDispute = (isClient || isFreelancer) && ["FUNDED", "MILESTONE_SUBMITTED"].includes(status);
  const canTimeout = isClient && ["FUNDED", "MILESTONE_SUBMITTED"].includes(status) && deadlinePassed;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{p.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{p.description}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <DashboardCard icon={Wallet} label="Total budget" value={inr(p.budget_eth)} tint="bg-client-50 text-client-600" />
        <DashboardCard icon={Lock} label="Held in escrow" value={ended ? "₹0" : inr(p.budget_eth)} tint="bg-amber-50 text-amber-600" />
        <DashboardCard icon={CheckCircle2} label="Released" value={status === "RELEASED" ? inr(p.budget_eth) : "₹0"} tint="bg-emerald-50 text-emerald-600" />
        <DashboardCard icon={Activity} label="Status" value={status.replace(/_/g, " ")} tint="bg-slate-100 text-slate-600" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Clock size={15} /> Deadline
          </h2>
          <Countdown deadline={p.deadline} />
        </div>
        <table className="w-full">
          <thead>
            <tr><th className="th">Detail</th><th className="th">Value</th></tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="td font-medium">Client</td>
              <td className="td font-mono text-xs">{p.client_wallet}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="td font-medium">Freelancer</td>
              <td className="td font-mono text-xs">{p.freelancer_wallet}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="td font-medium">Acceptance criteria</td>
              <td className="td">{p.acceptance_criteria}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="td font-medium">On-chain agreement</td>
              <td className="td">
                {chainId !== null && chainId !== undefined ? (
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-xs">#{chainId}</span>
                    <button onClick={readChain} className="btn-outline !py-1 !px-2 text-xs">
                      <RefreshCw size={12} /> Read on-chain status
                    </button>
                    {chainStatus && (
                      <span className="text-xs font-semibold text-slate-600">Chain says: {chainStatus}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-xs text-red-500">Not linked</span>
                )}
              </td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="td font-medium">Funding transaction</td>
              <td className="td"><TxHash hash={p.creation_tx_hash} /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Milestones</h2>
        </div>
        <table className="w-full">
          <thead><tr><th className="th">Title</th><th className="th">Amount</th><th className="th">Status</th></tr></thead>
          <tbody>
            {(p.milestones || []).map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="td">{m.title}<span className="block text-xs text-slate-400">{m.description}</span></td>
                <td className="td">{inr(m.amount_eth)}</td>
                <td className="td"><StatusBadge status={m.status} /></td>
              </tr>
            ))}
            {(p.milestones || []).length === 0 && (
              <tr><td className="td text-slate-400" colSpan={3}>No milestones.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(p.evidence || []).length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <FileCheck size={15} /> Submitted Evidence
          </h2>
          <ul className="space-y-3">
            {p.evidence.map((ev) => (
              <li key={ev.id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ev.file_name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">SHA-256: {ev.file_hash.slice(0, 20)}…</p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmtTime(ev.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ev.file_path && <a className="btn-outline !py-1 !px-2 text-xs" href={ev.file_path} target="_blank" rel="noreferrer">View file</a>}
                    {ev.file_path && (
                      <button onClick={() => verifyEvidence(ev)} disabled={busy} className="btn-outline !py-1 !px-2 text-xs">
                        Verify hash
                      </button>
                    )}
                    {verify[ev.id] === true && <span className="text-xs font-semibold text-emerald-600">✓ Verified</span>}
                    {verify[ev.id] === false && <span className="text-xs font-semibold text-red-600">✕ Mismatch</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canSubmit && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Upload size={15} /> Submit Milestone Proof
          </h2>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} className="text-sm mb-2 block" />
          <p className="text-xs text-slate-400 mb-2">…or describe the work instead of a file</p>
          <textarea
            rows={3} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Describe work done, GitHub link, or completion notes…"
            className="input mb-3"
          />
          <button onClick={handleSubmitEvidence} disabled={busy || (!file && !text.trim())} className="btn-green">
            {busy ? "Submitting…" : "Submit Milestone (signs with MetaMask)"}
          </button>
        </div>
      )}

      {(canAccept || canDispute || canTimeout) && (
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">Actions</h2>
          {canAccept && (
            <div className="flex items-center gap-2">
              <button onClick={handleAccept} disabled={busy} className="btn-green">
                {busy ? "Releasing…" : "Accept & Release Funds"}
              </button>
              <span className="text-xs text-slate-400">Releases {inr(p.budget_eth)} to the freelancer.</span>
            </div>
          )}
          {canDispute && (
            <div>
              {!showDispute ? (
                <button onClick={() => setShowDispute(true)} disabled={busy} className="btn-red">
                  Raise Dispute
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain the issue in detail…" className="input" />
                  <div className="flex gap-2">
                    <button onClick={handleDispute} disabled={busy || !reason.trim()} className="btn-red">
                      {busy ? "Submitting…" : "Submit Dispute"}
                    </button>
                    <button onClick={() => setShowDispute(false)} className="btn-outline">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {canTimeout && (
            <div className="flex items-center gap-2">
              <button onClick={handleTimeout} disabled={busy} className="btn-outline">
                Check Timeout (refund client)
              </button>
              <span className="text-xs text-slate-400">The deadline has passed.</span>
            </div>
          )}
        </div>
      )}

      {status === "DISPUTED" && (
        <div className="card p-4 bg-red-50 border-red-200">
          <p className="text-sm font-semibold text-red-700">This agreement is under dispute.</p>
          <p className="text-xs text-red-600 mt-1">
            Reason: {p.dispute_reason || "—"} A dispute reviewer will verify the evidence and resolve the case.
          </p>
        </div>
      )}

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Audit Timeline</h2>
        <AuditTimeline events={audit} />
      </div>
    </div>
  );
}
