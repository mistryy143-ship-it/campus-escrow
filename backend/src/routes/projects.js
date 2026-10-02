const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { q } = require("../db");
const { asyncH, ok, fail, requireRole, upsertUser } = require("../utils");

// ---- evidence file upload (10 MB limit) ----
const uploadDir = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.\-]/g, "_")}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

async function audit(projectId, eventType, actor, oldStatus, newStatus, description, txHash) {
  await q(
    `INSERT INTO audit_logs (project_id, event_type, actor_wallet, old_status, new_status, description, transaction_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (transaction_hash, event_type) DO NOTHING`,
    [projectId, eventType, actor, oldStatus, newStatus, description, txHash || null]
  );
}

// LIST projects (optional ?client= / ?freelancer= filter)
router.get("/", asyncH(async (req, res) => {
  let sql = "SELECT * FROM projects";
  const cond = [], params = [];
  if (req.query.client) { params.push(req.query.client.toLowerCase()); cond.push(`LOWER(client_wallet) = $${params.length}`); }
  if (req.query.freelancer) { params.push(req.query.freelancer.toLowerCase()); cond.push(`LOWER(freelancer_wallet) = $${params.length}`); }
  if (req.query.status) { params.push(req.query.status); cond.push(`status = $${params.length}`); }
  if (cond.length) sql += " WHERE " + cond.join(" AND ");
  sql += " ORDER BY id DESC";
  ok(res, (await q(sql, params)).rows);
}));

// CREATE project (off-chain record; blockchainAgreementId comes from the
// confirmed createAgreement tx so IDs are NEVER guessed — past problem).
router.post("/", requireRole("CLIENT"), asyncH(async (req, res) => {
  const b = req.body;
  if (!b.title || !b.description || !b.freelancerWallet || !b.acceptanceCriteria) {
    return fail(res, 400, "Missing required fields.");
  }
  const budget = Number(b.budgetEth);
  if (!(budget > 0)) return fail(res, 400, "Budget must be positive.");
  if (b.blockchainAgreementId === null || b.blockchainAgreementId === undefined) {
    return fail(res, 400, "blockchainAgreementId missing. Create the on-chain agreement first.");
  }
  await upsertUser(b.freelancerWallet, "FREELANCER");
  const dup = await q("SELECT id FROM projects WHERE blockchain_agreement_id = $1", [b.blockchainAgreementId]);
  if (dup.rows[0]) return ok(res, (await q("SELECT * FROM projects WHERE id = $1", [dup.rows[0].id])).rows[0]);

  const client = req.headers["x-wallet-address"].toLowerCase();
  const p = (await q(
    `INSERT INTO projects (title, description, client_wallet, freelancer_wallet, budget_eth, deadline, acceptance_criteria, blockchain_agreement_id, status, creation_tx_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'FUNDED',$9) RETURNING *`,
    [b.title, b.description, client, b.freelancerWallet.toLowerCase(), budget, b.deadline,
     b.acceptanceCriteria, b.blockchainAgreementId, b.creationTxHash || null]
  )).rows[0];

  for (const m of (b.milestones || [])) {
    await q(
      `INSERT INTO milestones (project_id, title, description, amount_eth, deadline) VALUES ($1,$2,$3,$4,$5)`,
      [p.id, m.title, m.description || "", Number(m.amountEth) || 0, m.deadline || null]
    );
  }
  await audit(p.id, "AGREEMENT_CREATED", client, null, "FUNDED",
    `Escrow funded on-chain (agreement #${b.blockchainAgreementId})`, b.creationTxHash);
  ok(res, p);
}));

// GET one project with milestones + evidence + latest dispute
router.get("/:id", asyncH(async (req, res) => {
  const p = (await q("SELECT * FROM projects WHERE id = $1", [req.params.id])).rows[0];
  if (!p) return fail(res, 404, "Project not found.");
  p.milestones = (await q("SELECT * FROM milestones WHERE project_id = $1 ORDER BY id", [p.id])).rows;
  p.evidence = (await q("SELECT * FROM evidence WHERE project_id = $1 ORDER BY id DESC", [p.id])).rows;
  p.dispute = (await q("SELECT * FROM disputes WHERE project_id = $1 ORDER BY id DESC LIMIT 1", [p.id])).rows[0] || null;
  ok(res, p);
}));

// AUDIT timeline for a project
router.get("/:id/audit", asyncH(async (req, res) => {
  ok(res, (await q(
    "SELECT * FROM audit_logs WHERE project_id = $1 ORDER BY created_at ASC, id ASC", [req.params.id]
  )).rows);
}));

// SUBMIT EVIDENCE (freelancer). Server re-hashes the file and rejects
// anything that does not match the client-computed SHA-256.
router.post("/:id/evidence", requireRole("FREELANCER"), upload.single("evidence"), asyncH(async (req, res) => {
  const p = (await q("SELECT * FROM projects WHERE id = $1", [req.params.id])).rows[0];
  if (!p) return fail(res, 404, "Project not found.");
  const providedHash = (req.body.hash || "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(providedHash)) return fail(res, 400, "Invalid SHA-256 hash.");

  let fileName, filePath, actualHash;
  if (req.file) {
    const buf = fs.readFileSync(req.file.path);
    actualHash = crypto.createHash("sha256").update(buf).digest("hex");
    fileName = req.file.originalname;
    filePath = "/uploads/" + req.file.filename;
  } else {
    fileName = req.body.fileName || "text-submission";
    filePath = "";
    actualHash = crypto.createHash("sha256").update(req.body.text || fileName).digest("hex");
  }
  if (actualHash !== providedHash) {
    if (req.file) fs.unlinkSync(req.file.path);
    return fail(res, 400, "Hash mismatch: file does not match the declared SHA-256.");
  }
  const ev = (await q(
    `INSERT INTO evidence (project_id, file_name, file_path, file_hash, submitted_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [p.id, fileName, filePath, actualHash, req.headers["x-wallet-address"].toLowerCase()]
  )).rows[0];
  await audit(p.id, "EVIDENCE_UPLOADED", req.headers["x-wallet-address"], p.status, p.status,
    `Evidence "${fileName}" uploaded (SHA-256 ${actualHash.slice(0, 12)}…)`);
  ok(res, ev);
}));

router.get("/:id/evidence", asyncH(async (req, res) => {
  ok(res, (await q("SELECT * FROM evidence WHERE project_id = $1 ORDER BY id DESC", [req.params.id])).rows);
}));

// RAISE DISPUTE (client or freelancer) — off-chain record; the on-chain
// raiseDispute call happens from the frontend in the same flow.
router.post("/:id/dispute", requireRole("CLIENT", "FREELANCER"), asyncH(async (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) return fail(res, 400, "Dispute reason is required.");
  const p = (await q("SELECT * FROM projects WHERE id = $1", [req.params.id])).rows[0];
  if (!p) return fail(res, 404, "Project not found.");
  const existing = await q("SELECT id FROM disputes WHERE project_id = $1 AND status = 'OPEN'", [p.id]);
  if (existing.rows[0]) return fail(res, 400, "An open dispute already exists for this project.");
  const d = (await q(
    `INSERT INTO disputes (project_id, raised_by, reason) VALUES ($1,$2,$3) RETURNING *`,
    [p.id, req.headers["x-wallet-address"].toLowerCase(), reason.trim()]
  )).rows[0];
  await q("UPDATE projects SET dispute_reason = $1 WHERE id = $2", [reason.trim(), p.id]);
  await audit(p.id, "DISPUTE_RAISED", req.headers["x-wallet-address"], p.status, "DISPUTED", reason.trim());
  ok(res, d);
}));

// UPDATE project & milestone status directly from frontend transactions
router.post("/:id/status", asyncH(async (req, res) => {
  const { status, txHash } = req.body;
  const p = (await q("SELECT * FROM projects WHERE id = $1", [req.params.id])).rows[0];
  if (!p) return fail(res, 404, "Project not found.");

  await q("UPDATE projects SET status = $1 WHERE id = $2", [status, p.id]);
  await q("UPDATE milestones SET status = $1 WHERE project_id = $2", [status, p.id]);

  await audit(
    p.id,
    status === "RELEASED" ? "FUNDS_RELEASED" : "MILESTONE_SUBMITTED",
    req.headers["x-wallet-address"] || p.client_wallet,
    p.status,
    status,
    `Status updated to ${status} via transaction`,
    txHash
  );

  ok(res, { success: true, status });
}));

module.exports = router;