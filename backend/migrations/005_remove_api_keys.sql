-- Migration to remove API key authentication
-- Namespace is now the only requirement for all memory operations
-- Namespaces are automatically created as needed

-- Remove API key column from agent_registrations table
-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table

-- Step 1: Create new table without api_key column
CREATE TABLE IF NOT EXISTS agent_registrations_new (
    agent_id TEXT PRIMARY KEY,
    namespace TEXT NOT NULL,
    permissions TEXT NOT NULL, -- JSON array: ["read", "write", "admin"]
    description TEXT,
    registration_date INTEGER NOT NULL DEFAULT (unixepoch()),
    last_access INTEGER NOT NULL DEFAULT (unixepoch()),
    active INTEGER NOT NULL DEFAULT 1 -- 1 for active, 0 for disabled
);

-- Step 2: Copy data from old table (excluding api_key)
INSERT INTO agent_registrations_new (
    agent_id, namespace, permissions, description, 
    registration_date, last_access, active
)
SELECT 
    agent_id, namespace, permissions, description, 
    registration_date, last_access, active
FROM agent_registrations;

-- Step 3: Drop old table
DROP TABLE agent_registrations;

-- Step 4: Rename new table to original name
ALTER TABLE agent_registrations_new RENAME TO agent_registrations;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_agent_registrations_namespace ON agent_registrations(namespace);
CREATE INDEX IF NOT EXISTS idx_agent_registrations_active ON agent_registrations(active);

-- Note: namespace_groups table remains unchanged
-- Namespaces will be automatically created when first referenced in memory operations
