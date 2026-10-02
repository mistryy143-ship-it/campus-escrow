const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function q(text, params) {
  return pool.query(text, params);
}

// Demo wallets = Hardhat default accounts 0, 1, 2
const DEMO_USERS = [
  { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", role: "CLIENT", name: "Aarav Shah (Demo Client)" },
  { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", role: "FREELANCER", name: "Priya Nair (Demo Freelancer)" },
  { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", role: "REVIEWER", name: "Prof. Rao (Dispute Reviewer)" },
];

async function ensureSchemaAndSeed() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  for (const u of DEMO_USERS) {
    await q(
      `INSERT INTO users (wallet_address, role, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (wallet_address) DO NOTHING`,
      [u.address.toLowerCase(), u.role, u.name]
    );
  }
  console.log("[db] Schema ready + demo users seeded.");
}

module.exports = { pool, q, ensureSchemaAndSeed };
