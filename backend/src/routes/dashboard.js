const express = require("express");
const router = express.Router();
const { q } = require("../db");
const { asyncH, ok } = require("../utils");

const ETH_INR = 250000; // demo peg: 1 ETH = ₹2,50,000

router.get("/client/:wallet", asyncH(async (req, res) => {
  const w = req.params.wallet.toLowerCase();
  const r = (await q(
    `SELECT COUNT(*)::int AS total_projects,
            COUNT(*) FILTER (WHERE status IN ('FUNDED','MILESTONE_SUBMITTED'))::int AS active_escrows,
            COUNT(*) FILTER (WHERE status = 'MILESTONE_SUBMITTED')::int AS pending_acceptance,
            COUNT(*) FILTER (WHERE status = 'DISPUTED')::int AS disputed,
            COALESCE(SUM(budget_eth) FILTER (WHERE status = 'RELEASED'), 0)::float AS released_eth
     FROM projects WHERE LOWER(client_wallet) = LOWER($1)`, [w]
  )).rows[0];
  ok(res, { ...r, released_inr: Math.round(r.released_eth * ETH_INR) });
}));

router.get("/freelancer/:wallet", asyncH(async (req, res) => {
  const w = req.params.wallet.toLowerCase();
  const r = (await q(
    `SELECT COUNT(*)::int AS assigned_projects,
            COUNT(*) FILTER (WHERE status = 'FUNDED')::int AS active_work,
            COUNT(*) FILTER (WHERE status = 'MILESTONE_SUBMITTED')::int AS under_review,
            COUNT(*) FILTER (WHERE status = 'DISPUTED')::int AS disputed,
            COUNT(*) FILTER (WHERE status = 'RELEASED')::int AS completed,
            COALESCE(SUM(budget_eth) FILTER (WHERE status = 'RELEASED'), 0)::float AS earned_eth
     FROM projects WHERE LOWER(freelancer_wallet) = LOWER($1)`, [w]
  )).rows[0];
  ok(res, { ...r, earned_inr: Math.round(r.earned_eth * ETH_INR) });
}));

router.get("/reviewer", asyncH(async (req, res) => {
  const r = (await q(
    `SELECT COUNT(*) FILTER (WHERE status = 'OPEN')::int AS open_disputes,
            COUNT(*) FILTER (WHERE status = 'RESOLVED')::int AS resolved_cases,
            (SELECT COALESCE(SUM(budget_eth),0)::float FROM projects WHERE status = 'RELEASED') AS released_eth,
            (SELECT COALESCE(SUM(budget_eth),0)::float FROM projects WHERE status = 'REFUNDED') AS refunded_eth
     FROM disputes`
  )).rows[0];
  ok(res, { ...r, released_inr: Math.round(r.released_eth * ETH_INR), refunded_inr: Math.round(r.refunded_eth * ETH_INR) });
}));

module.exports = router;
