import {
    get_raw_config,
    get_sectors,
    get_sector_configs,
    update_config,
    update_sector,
    delete_sector,
    reload_config,
    sector_cfg_raw,
} from "../../core/sectors";
import { all_async } from "../../core/db";

/**
 * @swagger
 * components:
 *   schemas:
 *     PatternDef:
 *       type: object
 *       required:
 *         - pattern
 *       properties:
 *         pattern:
 *           type: string
 *           description: Regular expression pattern string
 *         flags:
 *           type: string
 *           description: Regex flags (e.g., "i" for case-insensitive)
 *         description:
 *           type: string
 *           description: Human-readable description of what the pattern matches
 *     SectorConfigRaw:
 *       type: object
 *       required:
 *         - model
 *         - decay_lambda
 *         - weight
 *         - patterns
 *       properties:
 *         model:
 *           type: string
 *           description: Model identifier for the sector
 *         decay_lambda:
 *           type: number
 *           description: Decay rate for memory salience
 *         weight:
 *           type: number
 *           description: Weight multiplier for scoring
 *         patterns:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PatternDef'
 *     SectorConfigUpdate:
 *       type: object
 *       properties:
 *         model:
 *           type: string
 *         decay_lambda:
 *           type: number
 *         weight:
 *           type: number
 *         patterns:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PatternDef'
 */

export function sector_config_routes(app: any) {
    /**
     * @swagger
     * /api/sectors/config:
     *   get:
     *     summary: Get all sector configurations
     *     tags: [Sectors]
     *     responses:
     *       200:
     *         description: Current sector configurations
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 sectors:
     *                   type: array
     *                   items:
     *                     type: string
     *                 config:
     *                   type: object
     *                   additionalProperties:
     *                     $ref: '#/components/schemas/SectorConfigRaw'
     */
    app.get("/api/sectors/config", async (req: any, res: any) => {
        try {
            const config = get_raw_config();
            const sectors = get_sectors();
            res.json({
                sectors,
                config,
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message || "Internal error" });
        }
    });

    /**
     * @swagger
     * /api/sectors/config:
     *   put:
     *     summary: Replace all sector configurations
     *     tags: [Sectors]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             additionalProperties:
     *               $ref: '#/components/schemas/SectorConfigRaw'
     *     responses:
     *       200:
     *         description: Configuration updated successfully
     *       400:
     *         description: Invalid configuration
     */
    app.put("/api/sectors/config", async (req: any, res: any) => {
        try {
            const config = req.body;
            
            if (!config || typeof config !== "object") {
                return res.status(400).json({ error: "Invalid configuration: expected object" });
            }

            if (Object.keys(config).length === 0) {
                return res.status(400).json({ error: "Invalid configuration: at least one sector required" });
            }

            const result = update_config(config as Record<string, sector_cfg_raw>);
            
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json({
                success: true,
                sectors: get_sectors(),
                message: "Configuration updated successfully",
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message || "Internal error" });
        }
    });

    /**
     * @swagger
     * /api/sectors/config/{sector}:
     *   get:
     *     summary: Get a specific sector's configuration
     *     tags: [Sectors]
     *     parameters:
     *       - in: path
     *         name: sector
     *         required: true
     *         schema:
     *           type: string
     *         description: Sector name
     *     responses:
     *       200:
     *         description: Sector configuration
     *       404:
     *         description: Sector not found
     */
    app.get("/api/sectors/config/:sector", async (req: any, res: any) => {
        try {
            const { sector } = req.params;
            const config = get_raw_config();
            
            if (!config[sector]) {
                return res.status(404).json({ error: `Sector '${sector}' not found` });
            }

            res.json({
                sector,
                config: config[sector],
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message || "Internal error" });
        }
    });

    /**
     * @swagger
     * /api/sectors/config/{sector}:
     *   patch:
     *     summary: Update a specific sector's configuration
     *     tags: [Sectors]
     *     parameters:
     *       - in: path
     *         name: sector
     *         required: true
     *         schema:
     *           type: string
     *         description: Sector name
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/SectorConfigUpdate'
     *     responses:
     *       200:
     *         description: Sector updated successfully
     *       400:
     *         description: Invalid configuration
     *       404:
     *         description: Sector not found (when updating)
     */
    app.patch("/api/sectors/config/:sector", async (req: any, res: any) => {
        try {
            const { sector } = req.params;
            const settings = req.body;
            
            if (!settings || typeof settings !== "object") {
                return res.status(400).json({ error: "Invalid settings: expected object" });
            }

            const result = update_sector(sector, settings);
            
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json({
                success: true,
                sector,
                message: `Sector '${sector}' updated successfully`,
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message || "Internal error" });
        }
    });

    /**
     * @swagger
     * /api/sectors/config/{sector}:
     *   put:
     *     summary: Create or replace a sector's configuration
     *     tags: [Sectors]
     *     parameters:
     *       - in: path
     *         name: sector
     *         required: true
     *         schema:
     *           type: string
     *         description: Sector name
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/SectorConfigRaw'
     *     responses:
     *       200:
     *         description: Sector created/updated successfully
     *       400:
     *         description: Invalid configuration
     */
    app.put("/api/sectors/config/:sector", async (req: any, res: any) => {
        try {
            const { sector } = req.params;
            const settings = req.body as sector_cfg_raw;
            
            if (!settings || typeof settings !== "object") {
                return res.status(400).json({ error: "Invalid settings: expected object" });
            }

            // Validate required fields for create/replace
            if (!settings.model || settings.decay_lambda === undefined || 
                settings.weight === undefined || !settings.patterns) {
                return res.status(400).json({ 
                    error: "All fields required for PUT: model, decay_lambda, weight, patterns" 
                });
            }

            const config = get_raw_config();
            config[sector] = settings;
            
            const result = update_config(config);
            
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            res.json({
                success: true,
                sector,
                message: `Sector '${sector}' created/updated successfully`,
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message || "Internal error" });
        }
    });

    /**
     * @swagger
     * /api/sectors/config/{sector}:
     *   delete:
     *     summary: Delete a sector
     *     tags: [Sectors]
     *     parameters:
     *       - in: path
     *         name: sector
     *         required: true
     *         schema:
     *           type: string
     *         description: Sector name
     *     responses:
     *       200:
     *         description: Sector deleted successfully
     *       404:
     *         description: Sector not found
     */
    app.delete("/api/sectors/config/:sector", async (req: any, res: any) => {
        try {
            const { sector } = req.params;
            
            const result = delete_sector(sector);
            
            if (!result.success) {
                return res.status(404).json({ error: result.error });
            }

            res.json({
                success: true,
                sector,
                message: `Sector '${sector}' deleted successfully`,
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message || "Internal error" });
        }
    });

    /**
     * @swagger
     * /api/sectors/config/reload:
     *   post:
     *     summary: Reload sector configuration from file
     *     tags: [Sectors]
     *     responses:
     *       200:
     *         description: Configuration reloaded successfully
     *       500:
     *         description: Failed to reload configuration
     */
    app.post("/api/sectors/config/reload", async (req: any, res: any) => {
        try {
            const result = reload_config();
            
            if (!result.success) {
                return res.status(500).json({ error: result.error });
            }

            res.json({
                success: true,
                sectors: result.sectors,
                message: "Configuration reloaded successfully",
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message || "Internal error" });
        }
    });

    /**
     * @swagger
     * /api/sectors/stats:
     *   get:
     *     summary: Get sector statistics from the database
     *     tags: [Sectors]
     *     responses:
     *       200:
     *         description: Sector statistics
     */
    app.get("/api/sectors/stats", async (req: any, res: any) => {
        try {
            const stats = await all_async(`
                SELECT primary_sector as sector, 
                       count(*) as count, 
                       avg(salience) as avg_salience 
                FROM memories 
                GROUP BY primary_sector
            `);
            
            res.json({
                sectors: get_sectors(),
                stats,
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message || "Internal error" });
        }
    });
}
