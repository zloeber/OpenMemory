-- Migration: Remove agent registration system
-- Make namespace the primary isolation mechanism
-- This migration removes all agent-related tables and focuses on namespace-only architecture

-- Drop agent access log table
DROP TABLE IF EXISTS agent_access_log;

-- Drop agent registrations table  
DROP TABLE IF EXISTS agent_registrations;

-- Update namespace_groups table to remove agent dependencies
-- Keep the table but make it simpler for namespace tracking only
ALTER TABLE namespace_groups DROP COLUMN IF EXISTS created_by;

-- Add index for namespace lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_namespace_groups_namespace ON namespace_groups(namespace);

-- Note: Memories table already uses user_id which we'll repurpose as namespace
-- No changes needed to memories, vectors, or waypoints tables
-- They will simply use namespace as the user_id field
