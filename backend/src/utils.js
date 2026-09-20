const { q } = require("./db");

const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const ok = (res, data) => res.json({ success: true, data });
const fail = (res, status, message) => res.status(status).json({ success: false, message });

// Backend-enforced role check (never trust the frontend).
// Frontend sends the connected wallet in the x-wallet-address header.
function requireRole(...roles) {
  return async (req, res, next) => {
    const wallet = req.headers["x-wallet-address"];
    if (!wallet) return fail(res, 401, "Wallet header missing. Connect MetaMask.");
    const user = await q("SELECT role FROM users WHERE LOWER(wallet_address) = LOWER($1)", [wallet]);
    if (!user.rows[0]) return fail(res, 403, "Wallet not registered.");
    if (!roles.includes(user.rows[0].role)) {
      return fail(res, 403, `Access denied: ${user.rows[0].role} cannot perform this action.`);
    }
    req.user = user.rows[0];
    next();
  };
}

async function upsertUser(wallet, roleHint) {
  const addr = wallet.toLowerCase();
  await q(
    `INSERT INTO users (wallet_address, role) VALUES ($1, $2)
     ON CONFLICT (wallet_address) DO NOTHING`,
    [addr, roleHint || "CLIENT"]
  );
  const r = await q("SELECT * FROM users WHERE LOWER(wallet_address) = LOWER($1)", [addr]);
  return r.rows[0];
}

const STATUSES = ["CREATED","FUNDED","MILESTONE_SUBMITTED","ACCEPTED","DISPUTED","RESOLVED","TIMED_OUT","RELEASED","REFUNDED"];

module.exports = { asyncH, ok, fail, requireRole, upsertUser, STATUSES };
