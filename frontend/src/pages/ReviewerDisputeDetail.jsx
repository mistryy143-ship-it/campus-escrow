import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Contract } from "ethers";
import { FileCheck, XCircle, CheckCircle2, Gavel } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api.js";
import { inr, errMsg, shortAddr, sha256Hex, fmtTime } from "../utils/format.js";
import RoleLayout from "../components/RoleLayout.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import AuditTimeline from "../components/AuditTimeline.jsx";
import TxHash from "../components/TxHash.jsx";

export default function ReviewerDisputeDetail() {
  const { id } = useParams();
  const { account, signer, contractInfo } = useAuth();
  const { toast } = useToast();
  const [d, setD] = useState(null);
  const [verify, setVerify] = useState(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null); // "RELEASE" | "REFUND"
  const [reason, setReason] = useState("");

  const load = () => api(`/disputes/${id}`).then(setD).catch((e) => toast(errMsg(e), "error"));
  useEffect(() => { load(); }, [id]);

  if (!d) return <RoleLayout role="REVIEWER"><p className="text-slate-500">Loading…</p></RoleLayout>;

  const verifyEvidence = async (ev) => {
    try {
      const res = await fetch(ev.file_path);
      const buf = await res.arrayBuffer();
      const h = await sha256Hex(buf);
      setVerify(h === ev.file_hash);
    } catch { setVerify(false); }
  };

  const resolve = async (releaseToFreelancer) => {
    if (!reason.trim()) return toast("Resolution reason is required.", "error");
    if (!signer || !contractInfo) return toast("Connect your wallet first.", "error");
    if (d.blockchain_agreement_id === null || d.blockchain_agreement_id === undefined)
      return toast("Project not linked to chain.", "error");
    setBusy(true);
    try {
      const contract = new Contract(contractInfo.address, contractInfo.abi, signer);
      const tx = await contract.resolveDispute(d.blockchain_agreement_id, releaseToFreelancer);
      const receipt = await tx.wait();
      await api(`/disputes/${d.id}/resolve`, {
        method: "POST", wallet: account,
        body: { releaseToFreelancer, reason: reason.trim(), txHash: receipt.hash },
      });
      toast(`Dispute resolved: ${releaseToFreelancer ? "released to freelancer" : "refunded to client"}.`, "success");
      setModal(null); setReason("");
      await load();
    } catch (e) {
      console.error(e);
      toast(errMsg(e), "error");
    } finally { setBusy(false); }
  };

  const Section = ({ title, children }) => (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-slate-800 mb-3">{title}</h2>
      {children}
    </div>
  );

  return (
    <RoleLayout role="REVIEWER">
      <div className="max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Gavel size={20} className="text-reviewer-600" /> Case #{d.id}: {d.project_title}
          </h1>
          <StatusBadge status={d.status} />
        </div>

        <Section title="1. Project Information">
          <p className="text-sm text-slate-600">{d.description}</p>
          <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Budget</p><p className="font-bold">{inr(d.budget_eth)}</p></div>
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Deadline</p><p className="font-bold">{new Date(d.deadline).toLocaleDateString("en-IN")}</p></div>
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-400">Project status</p><StatusBadge status={d.project_status} /></div>
          </div>
          <p className="text-xs text-slate-500 mt-3"><span className="font-medium">Acceptance criteria:</span> {d.acceptance_criteria}</p>
        </Section>

        <Section title="2. Parties">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-client-200 bg-client-50 p-3">
              <p className="text-xs text-client-700 font-semibold">CLIENT</p>
              <p className="font-mono text-xs mt-1">{shortAddr(d.client_wallet)}</p>
              <p className="font-mono text-[10px] text-slate-400 break-all">{d.client_wallet}</p>
            </div>
            <div className="rounded-lg border border-freelancer-200 bg-freelancer-50 p-3">
              <p className="text-xs text-freelancer-700 font-semibold">FREELANCER</p>
              <p className="font-mono text-xs mt-1">{shortAddr(d.freelancer_wallet)}</p>
              <p className="font-mono text-[10px] text-slate-400 break-all">{d.freelancer_wallet}</p>
            </div>
          </div>
        </Section>

        <Section title="3. Dispute Information">
          <p className="text-sm text-slate-600"><span className="font-medium">Raised by:</span> <span className="font-mono text-xs">{shortAddr(d.raised_by)}</span></p>
          <p className="text-sm text-slate-600 mt-2"><span className="font-medium">Reason:</span> {d.reason}</p>
          <p className="text-xs text-slate-400 mt-1">{fmtTime(d.created_at)}</p>
        </Section>

        <Section title="4. Evidence (SHA-256 verifiable)">
          {(d.evidence || []).length === 0 && <p className="text-sm text-slate-400">No evidence files uploaded.</p>}
          <ul className="space-y-3">
            {(d.evidence || []).map((ev) => (
              <li key={ev.id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{ev.file_name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5 break-all">{ev.file_hash}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {ev.file_path && <a className="btn-outline !py-1 !px-2 text-xs" href={ev.file_path} target="_blank" rel="noreferrer">Open</a>}
                    {ev.file_path && (
                      <button onClick={() => verifyEvidence(ev)} className="btn-purple !py-1 !px-2 text-xs">
                        <FileCheck size={13} /> Verify Evidence
                      </button>
                    )}
                    {verify === true && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 size={14} /> Verified</span>}
                    {verify === false && <span className="flex items-center gap-1 text-xs font-semibold text-red-600"><XCircle size={14} /> Mismatch</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {d.evidence_hash && (
            <p className="text-xs text-slate-400 font-mono mt-3 break-all">On-chain evidence hash: {d.evidence_hash}</p>
          )}
        </Section>

        <Section title="5. Audit Timeline">
          <AuditTimeline events={d.audit} />
        </Section>

        {d.status === "OPEN" ? (
          <div className="card p-5 border-reviewer-300 bg-reviewer-50">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Resolve Dispute</h2>
            <div className="flex gap-2">
              <button onClick={() => setModal("RELEASE")} disabled={busy} className="btn-green">
                Release to Freelancer
              </button>
              <button onClick={() => setModal("REFUND")} disabled={busy} className="btn-red">
                Refund Client
              </button>
            </div>
          </div>
        ) : (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">Resolution</h2>
            <p className="text-sm">
              <StatusBadge status={d.status} />
              <span className="ml-2 font-semibold">{d.resolution === "RELEASE" ? "Released to freelancer" : "Refunded to client"}</span>
            </p>
            <p className="text-sm text-slate-500 mt-2">{d.resolution_reason}</p>
            <p className="text-xs text-slate-400 mt-2"><TxHash hash={d.resolution_tx_hash} /></p>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h3 className="font-bold text-slate-800">
              {modal === "RELEASE" ? "Release funds to freelancer?" : "Refund funds to client?"}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {modal === "RELEASE"
                ? `The freelancer will receive ${inr(d.budget_eth)}. This is final on-chain.`
                : `The client will be refunded ${inr(d.budget_eth)}. This is final on-chain.`}
            </p>
            <textarea
              rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Resolution reason (required for the audit trail)…"
              className="input mt-4"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setModal(null); setReason(""); }} className="btn-outline">Cancel</button>
              <button
                onClick={() => resolve(modal === "RELEASE")}
                disabled={busy || !reason.trim()}
                className={modal === "RELEASE" ? "btn-green" : "btn-red"}
              >
                {busy ? "Confirm in MetaMask…" : "Confirm Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </RoleLayout>
  );
}
