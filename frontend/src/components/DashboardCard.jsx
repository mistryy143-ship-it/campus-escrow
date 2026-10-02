export default function DashboardCard({ icon: Icon, label, value, tint }) {
  return (
    <div className="card p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${tint}`}>
        <Icon size={16} />
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}
