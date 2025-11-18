import { q, all_async, get_async } from "../../core/db";
import { env } from "../../core/cfg";
import { getEmbeddingInfo } from "../../memory/embed";

/**
 * Metrics API endpoint for namespace-level statistics
 * Returns engine statistics and useful data for monitoring
 */
export function metrics_routes(app: any) {
    app.get("/api/metrics", async (req: any, res: any) => {
        try {
            // Get query parameters for filtering
            const { namespace } = req.query;

            // Gather statistics
            const stats: any = {
                timestamp: new Date().toISOString(),
                service: "OpenMemory",
                version: "2.0.0",
                architecture: "namespace-based"
            };

            // Get namespace counts
            const namespaces = await q.all_namespaces.all();
            stats.namespaces = {
                total: namespaces.length,
                active: namespaces.filter((ns: any) => ns.active === 1).length
            };

            // Memory statistics
            if (namespace) {
                // Stats for specific namespace
                const memoryCount = await all_async(
                    `SELECT COUNT(*) as count FROM ${env.metadata_backend === 'postgres' ? 'public.memories' : 'memories'} WHERE user_id = ?`,
                    [namespace]
                );
                const sectorStats = await all_async(
                    `SELECT primary_sector, COUNT(*) as count FROM ${env.metadata_backend === 'postgres' ? 'public.memories' : 'memories'} WHERE user_id = ? GROUP BY primary_sector`,
                    [namespace]
                );

                stats.namespace = namespace;
                stats.memories = {
                    total: memoryCount[0]?.count || 0,
                    by_sector: sectorStats.reduce((acc: any, row: any) => {
                        acc[row.primary_sector] = row.count;
                        return acc;
                    }, {})
                };

                // Vector embeddings count
                const vectorCount = await all_async(
                    `SELECT COUNT(DISTINCT id) as count FROM ${env.metadata_backend === 'postgres' ? 'public.vectors' : 'vectors'} WHERE user_id = ?`,
                    [namespace]
                );
                stats.embeddings = {
                    total: vectorCount[0]?.count || 0
                };

            } else {
                // Global stats across all namespaces
                const memoryCount = await all_async(
                    `SELECT COUNT(*) as count FROM ${env.metadata_backend === 'postgres' ? 'public.memories' : 'memories'}`
                );
                const memoryByNamespace = await all_async(
                    `SELECT user_id as namespace, COUNT(*) as count FROM ${env.metadata_backend === 'postgres' ? 'public.memories' : 'memories'} GROUP BY user_id`
                );
                const sectorStats = await all_async(
                    `SELECT primary_sector, COUNT(*) as count FROM ${env.metadata_backend === 'postgres' ? 'public.memories' : 'memories'} GROUP BY primary_sector`
                );

                stats.memories = {
                    total: memoryCount[0]?.count || 0,
                    by_namespace: memoryByNamespace.reduce((acc: any, row: any) => {
                        acc[row.namespace || 'unknown'] = row.count;
                        return acc;
                    }, {}),
                    by_sector: sectorStats.reduce((acc: any, row: any) => {
                        acc[row.primary_sector] = row.count;
                        return acc;
                    }, {})
                };

                // Vector embeddings count
                const vectorCount = await all_async(
                    `SELECT COUNT(*) as count FROM ${env.metadata_backend === 'postgres' ? 'public.vectors' : 'vectors'}`
                );
                const vectorByNamespace = await all_async(
                    `SELECT user_id as namespace, COUNT(*) as count FROM ${env.metadata_backend === 'postgres' ? 'public.vectors' : 'vectors'} GROUP BY user_id`
                );

                stats.embeddings = {
                    total: vectorCount[0]?.count || 0,
                    by_namespace: vectorByNamespace.reduce((acc: any, row: any) => {
                        acc[row.namespace || 'unknown'] = row.count;
                        return acc;
                    }, {})
                };
            }

            // Database info
            stats.database = {
                backend: env.metadata_backend,
                path: env.metadata_backend === 'sqlite' ? env.db_path : undefined
            };

            // Configuration
            stats.config = {
                embedding_info: getEmbeddingInfo(),
                vector_dimension: env.vec_dim,
                cache_segments: env.cache_segments,
                proxy_only_mode: env.proxy_only_mode || false
            };

            res.json(stats);
        } catch (error) {
            console.error("[METRICS] Error:", error);
            res.status(500).json({
                error: "Failed to retrieve metrics",
                message: error instanceof Error ? error.message : String(error)
            });
        }
    });

    // Detailed namespace metrics
    app.get("/api/metrics/namespaces/:namespace", async (req: any, res: any) => {
        try {
            const { namespace } = req.params;

            // Check if namespace exists
            const ns = await q.get_namespace.get(namespace);
            if (!ns) {
                return res.status(404).json({
                    error: "Namespace not found",
                    namespace
                });
            }

            const stats: any = {
                namespace,
                timestamp: new Date().toISOString()
            };

            // Memory counts by sector
            const sectorStats = await all_async(
                `SELECT primary_sector, COUNT(*) as count, AVG(salience) as avg_salience FROM ${env.metadata_backend === 'postgres' ? 'public.memories' : 'memories'} WHERE user_id = ? GROUP BY primary_sector`,
                [namespace]
            );

            stats.memories = {
                total: sectorStats.reduce((sum: number, row: any) => sum + (row.count || 0), 0),
                by_sector: sectorStats.reduce((acc: any, row: any) => {
                    acc[row.primary_sector] = {
                        count: row.count,
                        avg_salience: parseFloat((row.avg_salience || 0).toFixed(4))
                    };
                    return acc;
                }, {})
            };

            // Recent activity
            const recentMemories = await all_async(
                `SELECT id, primary_sector, created_at, last_seen_at FROM ${env.metadata_backend === 'postgres' ? 'public.memories' : 'memories'} WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT 10`,
                [namespace]
            );

            stats.recent_activity = recentMemories.map((m: any) => ({
                id: m.id,
                sector: m.primary_sector,
                created_at: new Date(m.created_at * 1000).toISOString(),
                last_seen_at: new Date(m.last_seen_at * 1000).toISOString()
            }));

            // Waypoint connections
            const waypointCount = await all_async(
                `SELECT COUNT(*) as count FROM ${env.metadata_backend === 'postgres' ? 'public.waypoints' : 'waypoints'} WHERE user_id = ?`,
                [namespace]
            );

            stats.graph = {
                waypoints: waypointCount[0]?.count || 0
            };

            res.json(stats);
        } catch (error) {
            console.error("[METRICS] Error:", error);
            res.status(500).json({
                error: "Failed to retrieve namespace metrics",
                message: error instanceof Error ? error.message : String(error)
            });
        }
    });

    // System-wide aggregated metrics
    app.get("/api/metrics/summary", async (req: any, res: any) => {
        try {
            const summary: any = {
                timestamp: new Date().toISOString(),
                service: "OpenMemory",
                version: "2.0.0"
            };

            // Count active namespaces
            const namespaces = await q.all_namespaces.all();
            summary.namespaces = namespaces.length;

            // Total memories
            const totalMemories = await all_async(
                `SELECT COUNT(*) as count FROM ${env.metadata_backend === 'postgres' ? 'public.memories' : 'memories'}`
            );
            summary.total_memories = totalMemories[0]?.count || 0;

            // Total embeddings
            const totalEmbeddings = await all_async(
                `SELECT COUNT(*) as count FROM ${env.metadata_backend === 'postgres' ? 'public.vectors' : 'vectors'}`
            );
            summary.total_embeddings = totalEmbeddings[0]?.count || 0;

            // Sector distribution
            const sectorDist = await all_async(
                `SELECT primary_sector, COUNT(*) as count FROM ${env.metadata_backend === 'postgres' ? 'public.memories' : 'memories'} GROUP BY primary_sector`
            );
            summary.sector_distribution = sectorDist.reduce((acc: any, row: any) => {
                acc[row.primary_sector] = row.count;
                return acc;
            }, {});

            // Most active namespaces (by memory count)
            const topNamespaces = await all_async(
                `SELECT user_id as namespace, COUNT(*) as count FROM ${env.metadata_backend === 'postgres' ? 'public.memories' : 'memories'} GROUP BY user_id ORDER BY count DESC LIMIT 10`
            );
            summary.top_namespaces = topNamespaces.map((row: any) => ({
                namespace: row.namespace,
                memory_count: row.count
            }));

            res.json(summary);
        } catch (error) {
            console.error("[METRICS] Error:", error);
            res.status(500).json({
                error: "Failed to retrieve summary metrics",
                message: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
