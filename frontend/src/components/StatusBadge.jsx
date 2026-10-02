const MAP = {
  CREATED: "bg-slate-100 text-slate-700",
  FUNDED: "bg-client-100 text-client-700",
  MILESTONE_SUBMITTED: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-freelancer-100 text-freelancer-700",
  DISPUTED: "bg-red-100 text-red-700",
  RESOLVED: "bg-reviewer-100 text-reviewer-700",
  TIMED_OUT: "bg-orange-100 text-orange-700",
  RELEASED: "bg-emerald-100 text-emerald-700",
  REFUNDED: "bg-slate-200 text-slate-700",
  OPEN: "bg-red-100 text-red-700",
  PENDING: "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-amber-100 text-amber-700",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${MAP[status] || "bg-slate-100 text-slate-600"}`}>
      {status ? status.replace(/_/g, " ") : "—"}
    </span>
  );
}
