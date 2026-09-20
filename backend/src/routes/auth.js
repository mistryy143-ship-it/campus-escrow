const express = require("express");
const router = express.Router();
const { q } = require("../db");
const { asyncH, ok, fail } = require("../utils");

// Register or login a wallet, optionally pinning its role.
router.post("/login", asyncH(async (req, res) => {
  const { walletAddress, role } = req.body;
  if (!walletAddress) return fail(res, 400, "walletAddress is required");
  const addr = walletAddress.toLowerCase();
  let user = (await q("SELECT * FROM users WHERE LOWER(wallet_address) = LOWER($1)", [addr])).rows[0];
  if (!user) {
    user = (await q(
      "INSERT INTO users (wallet_address, role) VALUES ($1, $2) RETURNING *",
      [addr, role || "CLIENT"]
    )).rows[0];
  } else if (role && ["CLIENT", "FREELANCER", "REVIEWER"].includes(role) && user.role !== role) {
    user = (await q("UPDATE users SET role = $1 WHERE id = $2 RETURNING *", [role, user.id])).rows[0];
  }
  ok(res, { id: user.id, wallet_address: user.wallet_address, role: user.role, display_name: user.display_name });
}));

router.get("/user/:address", asyncH(async (req, res) => {
  const user = (await q("SELECT * FROM users WHERE LOWER(wallet_address) = LOWER($1)", [req.params.address])).rows[0];
  ok(res, user || null);
}));

module.exports = router;
