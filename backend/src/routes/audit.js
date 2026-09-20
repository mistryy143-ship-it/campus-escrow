const express = require("express");
const router = express.Router();
const { q } = require("../db");
const { asyncH, ok } = require("../utils");

// Global audit explorer
router.get("/", asyncH(async (req, res) => {
  ok(res, (await q(
    `SELECT a.*, p.title AS project_title FROM audit_logs a
     LEFT JOIN projects p ON p.id = a.project_id
     ORDER BY a.created_at DESC LIMIT 200`
  )).rows);
}));

module.exports = router;
