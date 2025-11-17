-- Migration to remove shared_namespaces support
-- Each agent can only be associated with a single namespace
-- Multiple agents can use the same namespace

-- Remove the shared_namespaces column from agent_registrations
-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table

-- Create new table without shared_namespaces
CREATE TABLE IF NOT EXISTS agent_registrations_new (
    agent_id TEXT PRIMARY KEY,
    namespace TEXT NOT NULL,
    permissions TEXT NOT NULL, -- JSON array: ["read", "write", "admin"]
    api_key TEXT NOT NULL UNIQUE,
    description TEXT,
    registration_date INTEGER NOT NULL DEFAULT (unixepoch()),
    last_access INTEGER NOT NULL DEFAULT (unixepoch()),
    active INTEGER NOT NULL DEFAULT 1 -- 1 for active, 0 for disabled
);

-- Copy data from old table (excluding shared_namespaces)
INSERT INTO agent_registrations_new (
    agent_id, namespace, permissions, api_key, description, 
    registration_date, last_access, active
)
SELECT 
    agent_id, namespace, permissions, api_key, description, 
    registration_date, last_access, active
FROM agent_registrations;

-- Drop old table
DROP TABLE agent_registrations;

-- Rename new table
ALTER TABLE agent_registrations_new RENAME TO agent_registrations;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_agent_registrations_namespace ON agent_registrations(namespace);
CREATE INDEX IF NOT EXISTS idx_agent_registrations_active ON agent_registrations(active);
