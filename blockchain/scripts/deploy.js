// Deploys CampusEscrow and copies {address, abi} to BOTH backend and
// frontend so the ABI can never drift out of sync (past problem #1).
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const CampusEscrow = await hre.ethers.getContractFactory("CampusEscrow");
  const escrow = await CampusEscrow.deploy();
  await escrow.waitForDeployment();
  const address = await escrow.getAddress();
  console.log("CampusEscrow deployed to:", address);

  const artifactPath = path.join(
    __dirname, "..", "artifacts", "contracts",
    "CampusEscrow.sol", "CampusEscrow.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const payload = JSON.stringify(
    { address, abi: artifact.abi, deployedAt: new Date().toISOString() },
    null, 2
  );

  const targets = [
    path.join(__dirname, "..", "..", "backend", "src", "abi", "CampusEscrow.json"),
    path.join(__dirname, "..", "..", "frontend", "public", "contract.json"),
  ];
  for (const t of targets) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, payload);
    console.log("Synced contract info ->", t);
  }
  console.log("\nDone. Start the backend listener and the frontend now.");
}

main().catch((e) => { console.error(e); process.exit(1); });
