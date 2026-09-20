// Event listener: polls the contract with queryFilter every 2s and mirrors
// on-chain events into PostgreSQL (project status, audit log, tx registry).
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { q, ensureSchemaAndSeed } = require("./db");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const STATUS_NAMES = ["CREATED","FUNDED","MILESTONE_SUBMITTED","ACCEPTED","DISPUTED","RESOLVED","TIMED_OUT","RELEASED","REFUNDED"];

const abiPath = path.join(__dirname, "abi", "CampusEscrow.json");
if (!fs.existsSync(abiPath)) {
  console.error("\n[listener] src/abi/CampusEscrow.json not found.");
  console.error("[listener] Deploy the contract first:");
  console.error("           cd blockchain && npx hardhat run scripts/deploy.js --network localhost\n");
  process.exit(1);
}
const { address: CONTRACT_ADDRESS, abi } = JSON.parse(fs.readFileSync(abiPath, "utf8"));

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

const EVENT_STATUS = {
  EscrowFunded: "FUNDED",
  MilestoneSubmitted: "MILESTONE_SUBMITTED",
  Accepted: "ACCEPTED",
  DisputeRaised: "DISPUTED",
  DisputeResolved: "RESOLVED",
  TimedOut: "TIMED_OUT",
  Released: "RELEASED",
  Refunded: "REFUNDED",
};

async function recordEvent(project, event) {
  const name = event.fragment.name;
  const txHash = event.transactionHash;
  const from = event.address; // contract
  const block = event.blockNumber;

  await q(
    `INSERT INTO blockchain_transactions (project_id, transaction_hash, transaction_type, from_address, block_number)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (transaction_hash, transaction_type) DO NOTHING`,
    [project.id, txHash, name, from, block]
  );

  if (name === "AgreementCreated") return; // no status change; row created by API

  const newStatus = EVENT_STATUS[name];
  if (newStatus) {
    const oldStatus = project.status;
    if (oldStatus !== newStatus) {
      await q("UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2", [newStatus, project.id]);
    }
    await q(
      `INSERT INTO audit_logs (project_id, event_type, actor_wallet, old_status, new_status, transaction_hash)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (transaction_hash, event_type) DO NOTHING`,
      [project.id, name, null, oldStatus, newStatus, txHash]
    );
    console.log(`[listener] Project #${project.id} (on-chain #${project.blockchain_agreement_id}): ${oldStatus} -> ${newStatus} (tx ${txHash.slice(0, 12)}...)`);
  } else {
    console.log(`[listener] Event ${name} on project #${project.id}`);
  }
}

let lastBlock = 0;
async function poll() {
  try {
    const current = await provider.getBlockNumber();
    if (lastBlock === 0) lastBlock = Math.max(0, current - 15);
    if (current >= lastBlock) {
      const events = await contract.queryFilter("*", lastBlock, current);
      for (const ev of events) {
        const chainId = Number(ev.args[0]);
        const res = await q("SELECT * FROM projects WHERE blockchain_agreement_id = $1", [chainId]);
        if (!res.rows[0]) {
          console.warn(`[listener] No project linked to on-chain agreement #${chainId} — skipping.`);
          continue;
        }
        await recordEvent(res.rows[0], ev);
      }
      lastBlock = current + 1;
    }
  } catch (e) {
    console.error("[listener] Poll error:", e.message);
  }
  setTimeout(poll, 2000);
}

(async () => {
  await ensureSchemaAndSeed();
  console.log(`[listener] Polling CampusEscrow at ${CONTRACT_ADDRESS} on ${RPC_URL} ...`);
  poll();
})();
