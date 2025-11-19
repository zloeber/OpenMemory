/**
 * Namespace Service
 * Handles namespace creation, retrieval, and management with ontology profile support
 */

import { q } from '../core/db';

export interface NamespaceConfig {
    namespace: string;
    description?: string;
    ontology_profile?: string;
    metadata?: Record<string, any>;
}

export interface NamespaceInfo {
    namespace: string;
    description: string;
    ontology_profile?: string;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
    active: number;
}

/**
 * Create or update a namespace with optional ontology profile
 * This is idempotent - will update if namespace exists
 */
export async function create_namespace(config: NamespaceConfig): Promise<NamespaceInfo> {
    const {
        namespace,
        description = '',
        ontology_profile = null,
        metadata = null
    } = config;

    // Validate namespace format
    if (!namespace || !/^[a-zA-Z0-9_-]+$/.test(namespace)) {
        throw new Error('Invalid namespace format. Must contain only alphanumeric characters, hyphens, and underscores');
    }

    const now = Math.floor(Date.now() / 1000);
    const metadata_json = metadata ? JSON.stringify(metadata) : null;

    // Insert or replace namespace
    await q.ins_namespace.run(
        namespace,
        description,
        ontology_profile,
        metadata_json,
        now,
        now,
        1 // active
    );

    const created = await get_namespace(namespace);
    if (!created) {
        throw new Error(`Failed to create namespace '${namespace}'`);
    }
    return created;
}

/**
 * Get namespace information
 */
export async function get_namespace(namespace: string): Promise<NamespaceInfo | null> {
    const ns = await q.get_namespace.get(namespace);
    
    if (!ns) {
        return null;
    }

    return {
        namespace: ns.namespace,
        description: ns.description || '',
        ontology_profile: ns.ontology_profile || undefined,
        metadata: ns.metadata ? JSON.parse(ns.metadata) : undefined,
        created_at: new Date(ns.created_at * 1000).toISOString(),
        updated_at: new Date(ns.updated_at * 1000).toISOString(),
        active: ns.active
    };
}

/**
 * List all active namespaces
 */
export async function list_namespaces(): Promise<NamespaceInfo[]> {
    const namespaces = await q.all_namespaces.all();
    
    return namespaces.map(ns => ({
        namespace: ns.namespace,
        description: ns.description || '',
        ontology_profile: ns.ontology_profile || undefined,
        metadata: ns.metadata ? JSON.parse(ns.metadata) : undefined,
        created_at: new Date(ns.created_at * 1000).toISOString(),
        updated_at: new Date(ns.updated_at * 1000).toISOString(),
        active: ns.active
    }));
}

/**
 * Update namespace details
 */
export async function update_namespace(
    namespace: string,
    updates: Partial<Omit<NamespaceConfig, 'namespace'>>
): Promise<NamespaceInfo> {
    const existing = await q.get_namespace.get(namespace);
    if (!existing) {
        throw new Error(`Namespace '${namespace}' not found`);
    }

    const now = Math.floor(Date.now() / 1000);
    const description = updates.description !== undefined ? updates.description : existing.description;
    const ontology_profile = updates.ontology_profile !== undefined ? updates.ontology_profile : existing.ontology_profile;
    const metadata_json = updates.metadata !== undefined 
        ? JSON.stringify(updates.metadata) 
        : existing.metadata;

    await q.upd_namespace_full.run(
        namespace,
        description,
        ontology_profile,
        metadata_json,
        now
    );

    const updated = await get_namespace(namespace);
    if (!updated) {
        throw new Error(`Failed to update namespace '${namespace}'`);
    }
    return updated;
}

/**
 * Ensure namespace exists, creating it if necessary
 * Used for auto-creation on first use
 */
export async function ensure_namespace_exists(
    namespace: string,
    auto_create_description?: string
): Promise<{ namespace: NamespaceInfo; created: boolean }> {
    let ns = await get_namespace(namespace);
    
    if (!ns) {
        console.log(`[NAMESPACE] Auto-creating namespace: ${namespace}`);
        ns = await create_namespace({
            namespace,
            description: auto_create_description || `Auto-created namespace: ${namespace}`
        });
        return { namespace: ns, created: true };
    }
    
    return { namespace: ns, created: false };
}

/**
 * Deactivate a namespace (soft delete)
 */
export async function deactivate_namespace(namespace: string): Promise<void> {
    const existing = await q.get_namespace.get(namespace);
    if (!existing) {
        throw new Error(`Namespace '${namespace}' not found`);
    }

    const now = Math.floor(Date.now() / 1000);
    await q.deactivate_namespace.run(namespace, now);
}

/**
 * Delete a namespace permanently
 */
export async function delete_namespace(namespace: string): Promise<void> {
    const existing = await q.get_namespace.get(namespace);
    if (!existing) {
        throw new Error(`Namespace '${namespace}' not found`);
    }

    await q.del_namespace.run(namespace);
}
