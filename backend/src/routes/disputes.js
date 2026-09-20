const express = require("express");
const router = express.Router();
const { q } = require("../db");
const { asyncH, ok, fail, requireRole } = require("../utils");

router.get("/", asyncH(async (req, res) => {
  ok(res, (await q(
    `SELECT d.*, p.title AS project_title, p.budget_eth, p.blockchain_agreement_id, p.status AS project_status,
            p.client_wallet, p.freelancer_wallet
     FROM disputes d JOIN projects p ON p.id = d.project_id
     ORDER BY d.id DESC`
  )).rows);
}));

router.get("/:id", asyncH(async (req, res) => {
  const d = (await q(
    `SELECT d.*, p.title AS project_title, p.description, p.budget_eth, p.deadline,
            p.blockchain_agreement_id, p.status AS project_status, p.evidence_hash,
            p.client_wallet, p.freelancer_wallet, p.acceptance_criteria
     FROM disputes d JOIN projects p ON p.id = d.project_id WHERE d.id = $1`, [req.params.id]
  )).rows[0];
  if (!d) return fail(res, 404, "Dispute not found.");
  d.evidence = (await q("SELECT * FROM evidence WHERE project_id = $1 ORDER BY id DESC", [d.project_id])).rows;
  d.audit = (await q("SELECT * FROM audit_logs WHERE project_id = $1 ORDER BY created_at ASC", [d.project_id])).rows;
  ok(res, d);
}));

// Record a reviewer's resolution (final on-chain status is written by the
// event listener when it sees DisputeResolved + Released/Refunded).
router.post("/:id/resolve", requireRole("REVIEWER"), asyncH(async (req, res) => {
  const { releaseToFreelancer, reason, txHash } = req.body;
  if (!reason || !reason.trim()) return fail(res, 400, "Resolution reason is required.");
  const d = (await q("SELECT * FROM disputes WHERE id = $1", [req.params.id])).rows[0];
  if (!d) return fail(res, 404, "Dispute not found.");
  if (d.status !== "OPEN") return fail(res, 400, "Dispute is already resolved.");
  const resolution = releaseToFreelancer ? "RELEASE" : "REFUND";
  const updated = (await q(
    `UPDATE disputes SET status = 'RESOLVED', resolution = $1, resolution_reason = $2,
                         resolution_tx_hash = $3, resolved_at = NOW() WHERE id = $4 RETURNING *`,
    [resolution, reason.trim(), txHash || null, d.id]
  )).rows[0];
  await q(
    `INSERT INTO audit_logs (project_id, event_type, actor_wallet, old_status, new_status, description, transaction_hash)
     VALUES ($1,'DISPUTE_RESOLVED',$2,$3,'RESOLVED',$4,$5)
     ON CONFLICT (transaction_hash, event_type) DO NOTHING`,
    [d.project_id, req.headers["x-wallet-address"].toLowerCase(), "DISPUTED",
     `Reviewer resolved dispute: ${releaseToFreelancer ? "RELEASE to freelancer" : "REFUND to client"} — ${reason.trim()}`,
     txHash || null]
  );
  ok(res, updated);
}));

module.exports = router;
