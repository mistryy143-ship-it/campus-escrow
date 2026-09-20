// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CampusEscrow - Verifiable Digital Escrow for Campus Freelance Projects
/// @notice Single-contract escrow. The contract is the source of truth for
///         money + status; the backend mirrors events into PostgreSQL.
contract CampusEscrow {
    enum Status {
        CREATED, FUNDED, MILESTONE_SUBMITTED, ACCEPTED,
        DISPUTED, RESOLVED, TIMED_OUT, RELEASED, REFUNDED
    }

    struct Agreement {
        address client;
        address freelancer;
        uint256 amount;
        uint256 deadline;
        Status status;
        string evidenceHash;   // SHA-256 of submitted evidence (off-chain file)
        string disputeReason;
    }

    uint256 public nextAgreementId;
    mapping(uint256 => Agreement) public agreements;
    mapping(uint256 => mapping(address => bool)) private participant;

    event AgreementCreated(uint256 indexed agreementId, address indexed client, address indexed freelancer, uint256 amount, uint256 deadline);
    event EscrowFunded(uint256 indexed agreementId, uint256 amount);
    event MilestoneSubmitted(uint256 indexed agreementId, string evidenceHash);
    event Accepted(uint256 indexed agreementId);
    event DisputeRaised(uint256 indexed agreementId, address indexed raisedBy, string reason);
    event DisputeResolved(uint256 indexed agreementId, address indexed reviewer, bool releaseToFreelancer);
    event TimedOut(uint256 indexed agreementId);
    event Released(uint256 indexed agreementId, address indexed to, uint256 amount);
    event Refunded(uint256 indexed agreementId, address indexed to, uint256 amount);

    modifier exists(uint256 id) {
        require(agreements[id].client != address(0), "Agreement does not exist");
        _;
    }

    /// Client creates AND funds the agreement in one transaction.
    function createAgreement(address freelancer, uint256 deadline) external payable returns (uint256) {
        require(msg.value > 0, "Must fund escrow with ETH");
        require(freelancer != address(0), "Invalid freelancer address");
        require(freelancer != msg.sender, "Client and freelancer must differ");
        require(deadline > block.timestamp, "Deadline must be in the future");

        uint256 id = nextAgreementId++;
        agreements[id] = Agreement({
            client: msg.sender,
            freelancer: freelancer,
            amount: msg.value,
            deadline: deadline,
            status: Status.FUNDED,
            evidenceHash: "",
            disputeReason: ""
        });
        participant[id][msg.sender] = true;
        participant[id][freelancer] = true;

        emit AgreementCreated(id, msg.sender, freelancer, msg.value, deadline);
        emit EscrowFunded(id, msg.value);
        return id;
    }

    /// Freelancer submits proof of work (SHA-256 hash of evidence file).
    function submitMilestone(uint256 id, string calldata evidenceHash) external exists(id) {
        Agreement storage a = agreements[id];
        require(msg.sender == a.freelancer, "Only freelancer");
        require(a.status == Status.FUNDED, "Not in FUNDED state");
        require(block.timestamp <= a.deadline, "Deadline passed");
        require(bytes(evidenceHash).length > 0, "Evidence hash required");

        a.status = Status.MILESTONE_SUBMITTED;
        a.evidenceHash = evidenceHash;
        emit MilestoneSubmitted(id, evidenceHash);
    }

    /// Client accepts submitted work -> funds released to freelancer.
    function accept(uint256 id) external exists(id) {
        Agreement storage a = agreements[id];
        require(msg.sender == a.client, "Only client");
        require(a.status == Status.MILESTONE_SUBMITTED, "No milestone to accept");
        a.status = Status.ACCEPTED;
        emit Accepted(id);
        _release(id);
    }

    /// Either party may raise a dispute while work is in progress.
    function raiseDispute(uint256 id, string calldata reason) external exists(id) {
        Agreement storage a = agreements[id];
        require(participant[id][msg.sender], "Only client or freelancer");
        require(
            a.status == Status.FUNDED || a.status == Status.MILESTONE_SUBMITTED,
            "Cannot dispute in this state"
        );
        require(bytes(reason).length > 0, "Reason required");
        a.status = Status.DISPUTED;
        a.disputeReason = reason;
        emit DisputeRaised(id, msg.sender, reason);
    }

    /// Reviewer resolves a dispute. (Demo: any address may resolve;
    /// restrict with a reviewer registry in production.)
    function resolveDispute(uint256 id, bool releaseToFreelancer) external exists(id) {
        Agreement storage a = agreements[id];
        require(a.status == Status.DISPUTED, "Not disputed");
        a.status = Status.RESOLVED;
        emit DisputeResolved(id, msg.sender, releaseToFreelancer);
        if (releaseToFreelancer) {
            _release(id);
        } else {
            _refund(id);
        }
    }

    /// Anyone can call after the deadline passes with no acceptance.
    function checkTimeout(uint256 id) external exists(id) {
        Agreement storage a = agreements[id];
        require(block.timestamp > a.deadline, "Deadline not passed yet");
        require(
            a.status == Status.FUNDED || a.status == Status.MILESTONE_SUBMITTED,
            "Cannot time out in this state"
        );
        a.status = Status.TIMED_OUT;
        emit TimedOut(id);
        _refund(id);
    }

    function getAgreement(uint256 id) external view returns (Agreement memory) {
        return agreements[id];
    }

    // Checks-Effects-Interactions: state mutated BEFORE external call.
    function _release(uint256 id) internal {
        Agreement storage a = agreements[id];
        uint256 amount = a.amount;
        a.amount = 0;
        a.status = Status.RELEASED;
        (bool ok, ) = a.freelancer.call{value: amount}("");
        require(ok, "Transfer to freelancer failed");
        emit Released(id, a.freelancer, amount);
    }

    function _refund(uint256 id) internal {
        Agreement storage a = agreements[id];
        uint256 amount = a.amount;
        a.amount = 0;
        a.status = Status.REFUNDED;
        (bool ok, ) = a.client.call{value: amount}("");
        require(ok, "Refund to client failed");
        emit Refunded(id, a.client, amount);
    }
}
