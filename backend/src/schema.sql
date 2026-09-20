-- CampusEscrow schema (idempotent: safe to run on every boot)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'CLIENT',
  display_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  client_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
  freelancer_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
  budget_eth NUMERIC(18,8) NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  acceptance_criteria TEXT NOT NULL,
  blockchain_agreement_id INTEGER UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'CREATED',
  evidence_hash TEXT,
  dispute_reason TEXT,
  creation_tx_hash VARCHAR(66),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestones (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount_eth NUMERIC(18,8) NOT NULL DEFAULT 0,
  deadline TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  submitted_by VARCHAR(42) NOT NULL,
  blockchain_tx_hash VARCHAR(66),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disputes (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  raised_by VARCHAR(42) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  resolution VARCHAR(20),
  resolution_reason TEXT,
  resolution_tx_hash VARCHAR(66),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  actor_wallet VARCHAR(42),
  old_status VARCHAR(30),
  new_status VARCHAR(30),
  description TEXT,
  transaction_hash VARCHAR(66),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (transaction_hash, event_type)
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  from_address VARCHAR(42),
  to_address VARCHAR(42),
  block_number BIGINT,
  status VARCHAR(20) DEFAULT 'CONFIRMED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (transaction_hash, transaction_type)
);
