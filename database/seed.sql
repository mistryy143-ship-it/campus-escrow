-- Demo users (Hardhat default accounts 0, 1, 2).
-- The backend seeds these automatically on startup; this file is for reference.
INSERT INTO users (wallet_address, role, display_name) VALUES
('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', 'CLIENT',     'Aarav Shah (Demo Client)'),
('0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 'FREELANCER', 'Priya Nair (Demo Freelancer)'),
('0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', 'REVIEWER',   'Prof. Rao (Dispute Reviewer)')
ON CONFLICT (wallet_address) DO NOTHING;
