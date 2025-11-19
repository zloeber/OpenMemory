-- Migration: Add ontology_profile and metadata to namespace_groups
-- Version: 003
-- Description: Adds ontology profile and metadata support to namespaces

-- SQLite
ALTER TABLE namespace_groups ADD COLUMN ontology_profile TEXT;
ALTER TABLE namespace_groups ADD COLUMN metadata TEXT;

-- PostgreSQL (uncomment if using PostgreSQL)
-- ALTER TABLE namespace_groups ADD COLUMN IF NOT EXISTS ontology_profile TEXT;
-- ALTER TABLE namespace_groups ADD COLUMN IF NOT EXISTS metadata TEXT;
