# CampusEscrow
### Verifiable Digital Escrow for Campus Freelance Projects and Milestone Disputes

A complete B.Sc. IT capstone project: React + Express + PostgreSQL + Solidity/Hardhat.
Funds are locked in a smart contract, work is proven with SHA-256 hashed evidence,
disputes are resolved by a reviewer role, and every state change is mirrored into
PostgreSQL by an event listener. **Three fully separate role UIs, all amounts in ₹ INR.**

---

## 0. One-time setup

1. Install **Node.js 18+** and **PostgreSQL** (you already have it on port **1429**).
2. Create the database once (in psql):
   `CREATE DATABASE campus_escrow;`
3. Import the 3 Hardhat wallets into MetaMask (see table below).
4. Make sure the backend `.env` has YOUR postgres password.

### Demo wallets (Hardhat defaults) — import into MetaMask

| Role       | Wallet                                     | Private key                                                        | Demo ₹ balance |
|------------|--------------------------------------------|--------------------------------------------------------------------|----------------|
| CLIENT     | 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 | 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 | ₹75,000        |
| FREELANCER | 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 | 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d | ₹25,000        |
| REVIEWER   | 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC | 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a | ₹0             |

---

## 1. Run it (4 terminals)

**Terminal 1 — local blockchain**
```
cd blockchain
npm install
npx hardhat node
```

**Terminal 2 — deploy contract (syncs ABI + address to backend & frontend automatically)**
```
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

**Terminal 3 — backend API + event listener**
```
cd backend
npm install
copy .env.example .env      :: then edit .env -> put YOUR postgres password (port 1429)
npm start                   :: API on :4000, auto-creates schema + seeds 3 demo users
```
Then open a **second** backend terminal: `npm run listener`
(the listener polls the chain every 2s and syncs status/audit rows into Postgres)

**Terminal 4 — frontend**
```
cd frontend
npm install
npm run dev                 :: http://localhost:5173
```

> Windows shortcut: double-click the `start-hardhat.bat`, `deploy.bat`,
> `start-backend.bat`, `start-listener.bat`, `start-frontend.bat` files instead.

Open **http://localhost:5173**, click **Launch App**, pick a role, connect MetaMask
(the app auto-switches MetaMask to **Hardhat Local, Chain ID 31337** — no more
"insufficient funds on mainnet" errors), and you land on that role's own dashboard.

---

## 2. Demo flows

**Happy path** — CLIENT: Create Project (₹2,50,000) → confirm in MetaMask →
FREELANCER: open project → attach evidence file → Submit Milestone →
CLIENT: Accept & Release Funds → watch Status go `RELEASED`, Escrow ₹0, Released ₹2,50,000.

**Dispute path** — CLIENT or FREELANCER: Raise Dispute →
REVIEWER: Dispute Review Center → open the case → **Verify Evidence**
(recomputes SHA-256 → ✓ Verified / ✕ Mismatch) → **Refund Client** (or Release) →
confirm in MetaMask → status chain `DISPUTED → RESOLVED → REFUNDED` with full audit trail.

---

## 3. How the old bugs are fixed (important for your viva)

| Past problem | Fix in this project |
|---|---|
| Frontend called functions that didn't exist (createMilestone, acceptMilestone) | Frontend only calls `createAgreement / submitMilestone / accept / raiseDispute / resolveDispute / checkTimeout` — exactly what `CampusEscrow.sol` defines. Deploy script copies the ABI to both apps. |
| ABI / address out of sync | `scripts/deploy.js` writes `backend/src/abi/CampusEscrow.json` AND `frontend/public/contract.json`. One source of truth. |
| "Agreement does not exist" — DB id 8 vs chain id 0 | The frontend parses the `AgreementCreated` event from the tx receipt and saves `blockchainAgreementId` at creation. IDs are never guessed or hardcoded. |
| Listener crashed: `FilterIdEventSubscriber: results is not iterable` | Listener uses **polling** `contract.queryFilter("*", from, to)` — no ethers subscriptions at all. |
| "insufficient funds" because MetaMask was on Ethereum mainnet | On connect, the app checks the chainId and auto-switches/adds **Hardhat Local (31337)**. |
| Audit-log / evidence routes 404 | All routes exist in one Express app; uploads served from `/uploads`; `/:id/audit` + global `/api/audit` both provided. |
| Restarting Hardhat wiped chain state | README instructs: after restarting `npx hardhat node`, re-run `deploy.bat` and create a fresh project (chain state is in-memory by design). |
| Manual SQL to link IDs / fix statuses | Not needed — creation links the ID; the listener writes every status + audit row automatically. |

---

## 4. Project structure
```
CampusEscrow/
├── blockchain/   contracts/CampusEscrow.sol, hardhat.config.js, scripts/deploy.js
├── backend/      Express API, Prisma-free raw pg, schema auto-run, event listener (polling)
├── frontend/     React+Vite+Tailwind, 3 role UIs, ₹ INR formatting, ethers v6
├── database/     seed.sql (reference — backend auto-seeds)
└── docs/         viva-notes.md
```

## 5. Security notes (viva points)
- Wallet + role validation on **every** protected endpoint (`requireRole` middleware) — backend never trusts the frontend.
- Evidence hash computed client-side, re-verified server-side, stored on-chain.
- 10 MB upload limit, filename sanitization, SQL parameterized (pg).
- Contract uses Checks-Effects-Interactions; state machine enforced by `require`.
- Local development only — never real money.
