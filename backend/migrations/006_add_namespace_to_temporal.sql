-- Migration to add namespace support to temporal facts and edges
-- This allows namespace-isolated temporal knowledge graphs

-- Step 1: Create new temporal_facts table with namespace column
CREATE TABLE IF NOT EXISTS temporal_facts_new (
    id TEXT PRIMARY KEY,
    namespace TEXT NOT NULL DEFAULT 'default',
    subject TEXT NOT NULL,
    predicate TEXT NOT NULL,
    object TEXT NOT NULL,
    valid_from INTEGER NOT NULL,
    valid_to INTEGER,
    confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
    last_updated INTEGER NOT NULL,
    metadata TEXT,
    UNIQUE(namespace, subject, predicate, object, valid_from)
);

-- Step 2: Copy existing data to new table (all existing facts go to 'default' namespace)
INSERT INTO temporal_facts_new (
    id, namespace, subject, predicate, object, valid_from, valid_to, 
    confidence, last_updated, metadata
)
SELECT 
    id, 'default', subject, predicate, object, valid_from, valid_to,
    confidence, last_updated, metadata
FROM temporal_facts;

-- Step 3: Drop old table
DROP TABLE temporal_facts;

-- Step 4: Rename new table to original name
ALTER TABLE temporal_facts_new RENAME TO temporal_facts;

-- Step 5: Recreate indexes with namespace awareness
CREATE INDEX IF NOT EXISTS idx_temporal_namespace ON temporal_facts(namespace);
CREATE INDEX IF NOT EXISTS idx_temporal_subject ON temporal_facts(subject);
CREATE INDEX IF NOT EXISTS idx_temporal_predicate ON temporal_facts(predicate);
CREATE INDEX IF NOT EXISTS idx_temporal_validity ON temporal_facts(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_temporal_composite ON temporal_facts(namespace, subject, predicate, valid_from, valid_to);

-- Step 6: Update temporal_edges table to add namespace support
CREATE TABLE IF NOT EXISTS temporal_edges_new (
    id TEXT PRIMARY KEY,
    namespace TEXT NOT NULL DEFAULT 'default',
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    valid_from INTEGER NOT NULL,
    valid_to INTEGER,
    weight REAL NOT NULL,
    metadata TEXT,
    FOREIGN KEY(source_id) REFERENCES temporal_facts(id),
    FOREIGN KEY(target_id) REFERENCES temporal_facts(id)
);

-- Step 7: Copy existing edge data
INSERT INTO temporal_edges_new (
    id, namespace, source_id, target_id, relation_type, valid_from, valid_to, weight, metadata
)
SELECT 
    id, 'default', source_id, target_id, relation_type, valid_from, valid_to, weight, metadata
FROM temporal_edges;

-- Step 8: Drop old edges table
DROP TABLE temporal_edges;

-- Step 9: Rename new edges table
ALTER TABLE temporal_edges_new RENAME TO temporal_edges;

-- Step 10: Recreate edge indexes
CREATE INDEX IF NOT EXISTS idx_edges_namespace ON temporal_edges(namespace);
CREATE INDEX IF NOT EXISTS idx_edges_source ON temporal_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON temporal_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_edges_validity ON temporal_edges(valid_from, valid_to);
