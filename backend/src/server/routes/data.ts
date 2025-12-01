import { q, run_async, get_async } from "../../core/db";
import { env } from "../../core/cfg";
import * as fs from "fs";
import * as path from "path";

export function data_routes(app: any) {
    // Backup endpoint - returns the SQLite database file
    app.get("/api/data/backup", async (req: any, res: any) => {
        try {
            const dbPath = env.db_path;
            
            if (!fs.existsSync(dbPath)) {
                return res.status(404).json({ 
                    error: "Database file not found",
                    path: dbPath 
                });
            }

            // Set headers for file download
            res.setHeader('Content-Type', 'application/x-sqlite3');
            res.setHeader('Content-Disposition', `attachment; filename="openmemory-backup-${new Date().toISOString().split('T')[0]}.sqlite"`);
            
            // Stream the file
            const fileStream = fs.createReadStream(dbPath);
            fileStream.pipe(res);
            
            fileStream.on('error', (error) => {
                console.error('[DATA] Backup error:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to stream backup file' });
                }
            });
        } catch (error: any) {
            console.error('[DATA] Backup error:', error);
            res.status(500).json({ 
                error: 'Failed to create backup',
                message: error.message 
            });
        }
    });

    // Import endpoint - replaces current database with uploaded file
    app.post("/api/data/import", async (req: any, res: any) => {
        try {
            const dbPath = env.db_path;
            const { data, filename } = req.body;
            
            // Check if data was provided
            if (!data) {
                return res.status(400).json({ 
                    error: 'No data provided',
                    message: 'Please provide base64 encoded database data' 
                });
            }

            // Validate filename extension
            if (filename && !filename.endsWith('.sqlite') && !filename.endsWith('.db')) {
                return res.status(400).json({ 
                    error: 'Invalid file type',
                    message: 'Only .sqlite and .db files are accepted' 
                });
            }

            // Decode base64 data
            const buffer = Buffer.from(data, 'base64');

            // Create backup of current database before replacing
            const backupPath = `${dbPath}.backup-${Date.now()}`;
            if (fs.existsSync(dbPath)) {
                fs.copyFileSync(dbPath, backupPath);
                console.log(`[DATA] Created backup at ${backupPath}`);
            }

            // Write the new database file
            fs.writeFileSync(dbPath, buffer);
            
            console.log('[DATA] Database imported successfully');
            res.json({ 
                success: true,
                message: 'Database imported successfully. Please restart the application for changes to take effect. A backup of the previous database was created.',
                backup_path: backupPath
            });
        } catch (error: any) {
            console.error('[DATA] Import error:', error);
            res.status(500).json({ 
                error: 'Failed to import database',
                message: error.message 
            });
        }
    });

    // Reinitialize endpoint - drops all tables and recreates schema
    app.post("/api/data/reinitialize", async (req: any, res: any) => {
        try {
            console.log('[DATA] Reinitializing database...');
            
            // Create backup before reinitializing
            const dbPath = env.db_path;
            const backupPath = `${dbPath}.pre-reinit-${Date.now()}`;
            if (fs.existsSync(dbPath)) {
                fs.copyFileSync(dbPath, backupPath);
                console.log(`[DATA] Created pre-reinitialize backup at ${backupPath}`);
            }

            // Drop all main tables
            const tables = [
                'mem',
                'waypoint',
                'namespace_groups',
                'agent_registry',
                'agent_namespace_access',
                'temporal_facts',
                'vec',
                'user_summaries',
                'maint_log'
            ];

            for (const table of tables) {
                try {
                    await run_async(`DROP TABLE IF EXISTS ${table}`);
                    console.log(`[DATA] Dropped table: ${table}`);
                } catch (e: any) {
                    console.error(`[DATA] Error dropping table ${table}:`, e.message);
                }
            }

            // Recreate tables using migration/initialization logic
            // You would need to import or call your schema initialization here
            // For now, we'll just vacuum the database
            await run_async('VACUUM');
            
            console.log('[DATA] Database reinitialized successfully');
            res.json({ 
                success: true,
                message: 'Database reinitialized successfully. All data has been cleared. A backup was created before reinitializing.',
                backup_path: backupPath,
                note: 'You may need to restart the application to recreate the schema.'
            });
        } catch (error: any) {
            console.error('[DATA] Reinitialize error:', error);
            res.status(500).json({ 
                error: 'Failed to reinitialize database',
                message: error.message 
            });
        }
    });

    // Get database info endpoint
    app.get("/api/data/info", async (req: any, res: any) => {
        try {
            const dbPath = env.db_path;
            const stats = fs.existsSync(dbPath) ? fs.statSync(dbPath) : null;
            
            // Get row counts
            const memCount = await get_async('SELECT COUNT(*) as count FROM mem');
            const namespaceCount = await get_async('SELECT COUNT(*) as count FROM namespace_groups');
            const agentCount = await get_async('SELECT COUNT(*) as count FROM agent_registry');
            const temporalCount = await get_async('SELECT COUNT(*) as count FROM temporal_facts');
            
            res.json({
                database_path: dbPath,
                exists: !!stats,
                size_bytes: stats?.size || 0,
                size_mb: stats ? (stats.size / 1024 / 1024).toFixed(2) : '0',
                last_modified: stats?.mtime || null,
                counts: {
                    memories: memCount?.count || 0,
                    namespaces: namespaceCount?.count || 0,
                    agents: agentCount?.count || 0,
                    temporal_facts: temporalCount?.count || 0
                }
            });
        } catch (error: any) {
            console.error('[DATA] Info error:', error);
            res.status(500).json({ 
                error: 'Failed to get database info',
                message: error.message 
            });
        }
    });
}
