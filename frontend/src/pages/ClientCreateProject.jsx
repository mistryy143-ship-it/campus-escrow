import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { Contract, parseEther, getAddress } from "ethers";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api.js";
import { ETH_INR, errMsg } from "../utils/format.js";
import RoleLayout from "../components/RoleLayout.jsx";

export default function ClientCreateProject() {
  const { account, signer, contractInfo } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "",
    freelancerWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    budgetInr: "250000", deadline: "", acceptanceCriteria: "",
  });
  const [milestones, setMilestones] = useState([]);
  const [mTitle, setMTitle] = useState(""); const [mAmount, setMAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const addMs = () => {
    if (!mTitle.trim() || !(Number(mAmount) > 0)) return toast("Enter milestone title and a positive ₹ amount.", "error");
    setMilestones((m) => [...m, { title: mTitle.trim(), description: "", amountEth: Number(mAmount) / ETH_INR, amountInr: Number(mAmount) }]);
    setMTitle(""); setMAmount("");
  };
  const budgetEth = (Number(form.budgetInr) || 0) / ETH_INR;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!signer || !contractInfo) return toast("Connect your wallet first.", "error");
    setBusy(true);
    try {
      const freelancer = getAddress(form.freelancerWallet.trim());
      const deadlineTs = Math.floor(new Date(form.deadline).getTime() / 1000);
      if (deadlineTs <= Math.floor(Date.now() / 1000)) throw new Error("Deadline must be in the future.");

      const contract = new Contract(contractInfo.address, contractInfo.abi, signer);
      const tx = await contract.createAgreement(freelancer, deadlineTs, { value: parseEther(budgetEth.toString()) });
      const receipt = await tx.wait();

      // Capture the real on-chain ID from the event — never guess IDs.
      let chainId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === "AgreementCreated") { chainId = Number(parsed.args[0]); break; }
        } catch {}
      }
      if (chainId === null) throw new Error("Could not read AgreementCreated event from the receipt.");

      const saved = await api("/projects", {
        method: "POST", wallet: account,
        body: {
          title: form.title, description: form.description,
          freelancerWallet: freelancer, budgetEth,
          deadline: new Date(form.deadline).toISOString(),
          acceptanceCriteria: form.acceptanceCriteria,
          milestones, blockchainAgreementId: chainId,
          creationTxHash: receipt.hash,
        },
      });
      toast("Project created and escrow funded on-chain.", "success");
      navigate(`/client/projects/${saved.id}`);
    } catch (err) {
      console.error(err);
      toast(errMsg(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <RoleLayout role="CLIENT">
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-slate-800 mb-6">Create Project & Fund Escrow</h1>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div><label className="label">Project title</label>
            <input required className="input" value={form.title} onChange={(e) => upd("title", e.target.value)} /></div>
          <div><label className="label">Description</label>
            <textarea required rows={3} className="input" value={form.description} onChange={(e) => upd("description", e.target.value)} /></div>
          <div><label className="label">Freelancer wallet address</label>
            <input required className="input font-mono" value={form.freelancerWallet} onChange={(e) => upd("freelancerWallet", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Budget (₹ INR)</label>
              <input required type="number" min="1" className="input" value={form.budgetInr} onChange={(e) => upd("budgetInr", e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">≈ {budgetEth.toFixed(4)} ETH locked on-chain</p></div>
            <div><label className="label">Deadline</label>
              <input required type="date" className="input" value={form.deadline} onChange={(e) => upd("deadline", e.target.value)} /></div>
          </div>
          <div><label className="label">Acceptance criteria</label>
            <textarea required rows={2} className="input" value={form.acceptanceCriteria} onChange={(e) => upd("acceptanceCriteria", e.target.value)} /></div>

          <div>
            <label className="label">Milestones</label>
            <div className="flex gap-2 mb-2">
              <input placeholder="Milestone title" className="input flex-1" value={mTitle} onChange={(e) => setMTitle(e.target.value)} />
              <input placeholder="Amount (₹)" type="number" className="input w-36" value={mAmount} onChange={(e) => setMAmount(e.target.value)} />
              <button type="button" onClick={addMs} className="btn-blue"><Plus size={14} /> Add</button>
            </div>
            {milestones.length > 0 && (
              <ul className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-sm">
                {milestones.map((m, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-2">
                    <span>{m.title}</span>
                    <span className="flex items-center gap-3">₹{(m.amountInr || 0).toLocaleString("en-IN")}
                      <button type="button" onClick={() => setMilestones((ms) => ms.filter((_, j) => j !== i))} className="text-red-500"><Trash2 size={14} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" disabled={busy} className="btn-blue w-full justify-center !py-3">
            {busy ? "Confirm in MetaMask…" : `Create & Fund Escrow (₹${(Number(form.budgetInr) || 0).toLocaleString("en-IN")})`}
          </button>
        </form>
      </div>
    </RoleLayout>
  );
}
