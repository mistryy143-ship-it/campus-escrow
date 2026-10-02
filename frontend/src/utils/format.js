// Fixed demo peg — see docs/viva-notes.md for the production discussion.
export const ETH_INR = 250000; // 1 ETH = ₹2,50,000

export const inr = (eth) =>
  "₹" + Math.round((Number(eth) || 0) * ETH_INR).toLocaleString("en-IN");

export const shortAddr = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "");

export const sameAddr = (a, b) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

export async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export const sha256File = async (file) => sha256Hex(await file.arrayBuffer());
export const sha256Text = async (text) => sha256Hex(new TextEncoder().encode(text));

export const errMsg = (e) =>
  (e && (e.reason || e.shortMessage)) || (e && e.message) || "Something went wrong";

export const fmtTime = (t) => (t ? new Date(t).toLocaleString("en-IN") : "—");
