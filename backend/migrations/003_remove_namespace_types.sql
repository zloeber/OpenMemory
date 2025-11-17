-- Remove namespace group_type as it's not being used for access control
-- This migration removes the group_type column and associated index

-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
-- Step 1: Create new table without group_type
CREATE TABLE IF NOT EXISTS namespace_groups_new (
    namespace TEXT PRIMARY KEY,
    description TEXT,
    created_by TEXT, -- agent_id that created this namespace
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (created_by) REFERENCES agent_registrations(agent_id)
);

-- Step 2: Copy data from old table (excluding group_type)
INSERT INTO namespace_groups_new (namespace, description, created_by, created_at, updated_at, active)
SELECT namespace, description, created_by, created_at, updated_at, active
FROM namespace_groups
WHERE 1=1; -- Use WHERE 1=1 to ensure this works even if old table doesn't exist

-- Step 3: Drop old table
DROP TABLE IF EXISTS namespace_groups;

-- Step 4: Rename new table to original name
ALTER TABLE namespace_groups_new RENAME TO namespace_groups;

-- Step 5: Recreate indexes (without the group_type index)
CREATE INDEX IF NOT EXISTS idx_namespace_groups_created_at ON namespace_groups(created_at);
CREATE INDEX IF NOT EXISTS idx_namespace_groups_active ON namespace_groups(active);
