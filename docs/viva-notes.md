# Viva Notes — CampusEscrow

## One-line pitch
"CampusEscrow is a verifiable digital escrow for campus freelance projects:
a Solidity smart contract holds the client's funds, the freelancer submits
SHA-256-hashed evidence on-chain, and disputes are resolved by a reviewer —
every state change is mirrored into PostgreSQL by an event listener, giving
a complete audit trail."

## Architecture (be able to draw this)
MetaMask (wallet)
  -> React frontend (ethers.js)        -- tx signing
  -> Hardhat local EVM (localhost:8545) -- source of truth for funds/status
  -> Event listener (polls queryFilter) -> PostgreSQL (readable mirror)
  -> Express REST API -> React dashboards (3 role UIs, amounts in ₹)

## Key design decisions to mention
1. Contract is source of truth; DB is a read-only mirror. Only the
   listener writes status changes (never the API directly).
2. Evidence integrity: SHA-256 computed in the BROWSER before upload,
   re-verified server-side, stored on-chain in the MilestoneSubmitted event.
   Reviewer can re-verify the file hash at any time.
3. Reentrancy protection: Checks-Effects-Interactions in _release/_refund.
4. Duplicate protection: UNIQUE(tx_hash, event_type) in audit + tx tables.
5. Listener uses polling (queryFilter) instead of contract.on because
   ethers v6 subscriptions crash against Hardhat's filter responses.
6. Contract address + ABI are copied to backend & frontend by the deploy
   script, so the frontend can never call a stale ABI.
7. blockchain_agreement_id is captured from the AgreementCreated event at
   creation time — IDs are never guessed.

## INR display
Blockchain settles in ETH (Hardhat local). The UI shows ₹ using a fixed
demo peg of 1 ETH = ₹2,50,000 (backend constant ETH_INR, frontend
utils/format.js). Mention: production would use an INR-pegged stablecoin
or an oracle/ payment-gateway bridge.

## Demo wallets (Hardhat defaults)
- CLIENT     0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (₹75,000 INR demo)
- FREELANCER 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (₹25,000 INR demo)
- REVIEWER   0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (₹0 INR demo)

## Happy-path demo script
1. Login as CLIENT -> Create Project (budget ₹2,50,000) -> MetaMask confirm
2. Login as FREELANCER -> project -> upload evidence -> Submit Milestone
3. Login as CLIENT -> Accept & Release Funds -> show escrow 0 / released ₹
4. Show Timeline + listener terminal logs.

## Dispute-path demo script
1. Create + fund a second project (freelancer submits weak work)
2. CLIENT raises dispute (or freelancer does)
3. Login as REVIEWER -> Dispute Review Center -> open dispute ->
   Verify Evidence (hash check) -> REFUND CLIENT -> confirm tx
4. Show status RESOLVED -> REFUNDED, audit trail, reviewer KPIs.
