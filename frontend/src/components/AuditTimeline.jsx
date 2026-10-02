import { FileText } from "lucide-react";
import TxHash from "./TxHash.jsx";
import { fmtTime } from "../utils/format.js";

const EVENT_LABEL = {
  AGREEMENT_CREATED: "Agreement created & escrow funded",
  EVIDENCE_UPLOADED: "Evidence uploaded",
  DISPUTE_RAISED: "Dispute raised",
  DISPUTE_RESOLVED: "Dispute resolved by reviewer",
  EscrowFunded: "Escrow funded on-chain",
  MilestoneSubmitted: "Milestone submitted on-chain",
  Accepted: "Client accepted work",
  DisputeRaised: "Dispute raised on-chain",
  DisputeResolved: "Dispute resolved on-chain",
  TimedOut: "Escrow timed out",
  Released: "Funds released to freelancer",
  Refunded: "Funds refunded to client",
};

export default function AuditTimeline({ events }) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-slate-400">No events recorded yet.</p>;
  }
  return (
    <ol className="relative border-l border-slate-200 ml-2 space-y-5">
      {events.map((e, i) => (
        <li key={e.id || i} className="ml-5">
          <span className="absolute -left-2.5 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 border border-slate-300">
            <FileText size={11} className="text-slate-500" />
          </span>
          <p className="text-sm font-medium text-slate-800">
            {EVENT_LABEL[e.event_type] || e.event_type}
            {e.old_status && e.new_status && e.old_status !== e.new_status && (
              <span className="ml-2 text-xs font-normal text-slate-500">
                {e.old_status} → {e.new_status}
              </span>
            )}
          </p>
          {e.description && <p className="text-xs text-slate-500 mt-0.5">{e.description}</p>}
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            <span>{fmtTime(e.created_at)}</span>
            <TxHash hash={e.transaction_hash} />
          </div>
        </li>
      ))}
    </ol>
  );
}
