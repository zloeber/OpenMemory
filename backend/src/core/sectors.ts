import { readFileSync, writeFileSync, existsSync, watchFile, unwatchFile } from "fs";
import { join } from "path";

/**
 * Pattern definition from YAML configuration
 */
export interface pattern_def {
    pattern: string;
    flags: string;
    description?: string;
}

/**
 * Sector configuration structure
 */
export interface sector_cfg {
    model: string;
    decay_lambda: number;
    weight: number;
    patterns: RegExp[];
}

/**
 * Raw YAML sector configuration (before pattern compilation)
 */
export interface sector_cfg_raw {
    model: string;
    decay_lambda: number;
    weight: number;
    patterns: pattern_def[];
}

/**
 * Full configuration file structure
 */
export type sectors_config = Record<string, sector_cfg>;
export type sectors_config_raw = Record<string, sector_cfg_raw>;

// Configuration state
let config: sectors_config | null = null;
let config_raw: sectors_config_raw | null = null;
let config_path: string = "";
let file_watcher_enabled = false;

/**
 * Get the configuration file path
 */
export function get_config_path(): string {
    if (config_path) return config_path;
    config_path = join(__dirname, "../../config/sectors.yml");
    return config_path;
}

/**
 * Parse a simple YAML file into a configuration object
 * This is a lightweight parser for the specific sectors.yml format
 */
function parse_yaml(yml: string): sectors_config_raw {
    const lines = yml.split("\n");
    const result: sectors_config_raw = {};
    let current_sector: string | null = null;
    let current_patterns: pattern_def[] = [];
    let in_patterns = false;
    let current_pattern: Partial<pattern_def> | null = null;

    for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith("#")) continue;

        const indent = line.search(/\S/);
        
        // Top-level sector (no indent)
        if (indent === 0 && trimmed.endsWith(":")) {
            // Save previous sector if exists
            if (current_sector && result[current_sector]) {
                result[current_sector].patterns = current_patterns;
            }
            
            current_sector = trimmed.slice(0, -1);
            result[current_sector] = {
                model: "",
                decay_lambda: 0,
                weight: 1,
                patterns: [],
            };
            current_patterns = [];
            in_patterns = false;
            current_pattern = null;
            continue;
        }

        if (!current_sector) continue;

        // Sector properties (indent 2)
        if (indent === 2) {
            const [key, ...val_parts] = trimmed.split(":");
            const val = val_parts.join(":").trim();

            if (key === "model") {
                result[current_sector].model = val.replace(/^["']|["']$/g, "");
            } else if (key === "decay_lambda") {
                result[current_sector].decay_lambda = parseFloat(val);
            } else if (key === "weight") {
                result[current_sector].weight = parseFloat(val);
            } else if (key === "patterns") {
                in_patterns = true;
                current_patterns = [];
            }
            continue;
        }

        // Pattern list items (indent 4, starts with -)
        if (indent === 4 && trimmed.startsWith("-") && in_patterns) {
            // Save previous pattern
            if (current_pattern && current_pattern.pattern) {
                current_patterns.push(current_pattern as pattern_def);
            }
            
            // Start new pattern
            const rest = trimmed.slice(1).trim();
            if (rest.startsWith("pattern:")) {
                const patternVal = rest.slice("pattern:".length).trim();
                current_pattern = {
                    pattern: patternVal.replace(/^["']|["']$/g, ""),
                    flags: "",
                };
            }
            continue;
        }

        // Pattern properties (indent 6)
        if (indent === 6 && current_pattern && in_patterns) {
            const [key, ...val_parts] = trimmed.split(":");
            const val = val_parts.join(":").trim().replace(/^["']|["']$/g, "");

            if (key === "pattern") {
                current_pattern.pattern = val;
            } else if (key === "flags") {
                current_pattern.flags = val;
            } else if (key === "description") {
                current_pattern.description = val;
            }
        }
    }

    // Save last pattern and sector
    if (current_pattern && current_pattern.pattern) {
        current_patterns.push(current_pattern as pattern_def);
    }
    if (current_sector && result[current_sector]) {
        result[current_sector].patterns = current_patterns;
    }

    return result;
}

/**
 * Serialize configuration back to YAML format
 */
function serialize_yaml(cfg: sectors_config_raw): string {
    let yml = "# OpenMemory Sector Configuration\n";
    yml += "# This file defines the memory sectors and their properties.\n";
    yml += "# It can be modified at runtime via the API.\n\n";

    for (const [sector, settings] of Object.entries(cfg)) {
        yml += `${sector}:\n`;
        yml += `  model: "${settings.model}"\n`;
        yml += `  decay_lambda: ${settings.decay_lambda}\n`;
        yml += `  weight: ${settings.weight}\n`;
        yml += `  patterns:\n`;

        for (const pattern of settings.patterns) {
            yml += `    - pattern: '${pattern.pattern}'\n`;
            yml += `      flags: '${pattern.flags || ""}'\n`;
            if (pattern.description) {
                yml += `      description: "${pattern.description}"\n`;
            }
        }
        yml += "\n";
    }

    return yml;
}

/**
 * Compile patterns from raw config to RegExp objects
 */
function compile_patterns(raw: sectors_config_raw): sectors_config {
    const compiled: sectors_config = {};
    
    for (const [sector, settings] of Object.entries(raw)) {
        compiled[sector] = {
            model: settings.model,
            decay_lambda: settings.decay_lambda,
            weight: settings.weight,
            patterns: settings.patterns.map((p) => {
                try {
                    return new RegExp(p.pattern, p.flags || "");
                } catch (e) {
                    console.error(`[SECTORS] Invalid pattern in ${sector}: ${p.pattern}`, e);
                    // Return a never-matching pattern for invalid patterns
                    return /(?!)/;
                }
            }),
        };
    }
    
    return compiled;
}

/**
 * Get default sector configuration (fallback if no file exists)
 */
function get_defaults(): sectors_config_raw {
    return {
        episodic: {
            model: "episodic-optimized",
            decay_lambda: 0.015,
            weight: 1.2,
            patterns: [
                { pattern: "\\b(today|yesterday|last\\s+week|remember\\s+when|that\\s+time)\\b", flags: "i" },
                { pattern: "\\b(I\\s+(did|went|saw|met|felt))\\b", flags: "i" },
                { pattern: "\\b(at\\s+\\d+:\\d+|on\\s+\\w+day|in\\s+\\d{4})\\b", flags: "i" },
                { pattern: "\\b(happened|occurred|experience|event|moment)\\b", flags: "i" },
            ],
        },
        semantic: {
            model: "semantic-optimized",
            decay_lambda: 0.005,
            weight: 1.0,
            patterns: [
                { pattern: "\\b(define|definition|meaning|concept|theory)\\b", flags: "i" },
                { pattern: "\\b(what\\s+is|how\\s+does|why\\s+do|facts?\\s+about)\\b", flags: "i" },
                { pattern: "\\b(principle|rule|law|algorithm|method)\\b", flags: "i" },
                { pattern: "\\b(knowledge|information|data|research|study)\\b", flags: "i" },
            ],
        },
        procedural: {
            model: "procedural-optimized",
            decay_lambda: 0.008,
            weight: 1.1,
            patterns: [
                { pattern: "\\b(how\\s+to|step\\s+by\\s+step|procedure|process)\\b", flags: "i" },
                { pattern: "\\b(first|then|next|finally|afterwards)\\b", flags: "i" },
                { pattern: "\\b(install|configure|setup|run|execute)\\b", flags: "i" },
                { pattern: "\\b(tutorial|guide|instructions|manual)\\b", flags: "i" },
                { pattern: "\\b(click|press|type|enter|select)\\b", flags: "i" },
            ],
        },
        emotional: {
            model: "emotional-optimized",
            decay_lambda: 0.02,
            weight: 1.3,
            patterns: [
                { pattern: "\\b(feel|feeling|felt|emotion|mood)\\b", flags: "i" },
                { pattern: "\\b(happy|sad|angry|excited|worried|anxious|calm)\\b", flags: "i" },
                { pattern: "\\b(love|hate|like|dislike|enjoy|fear)\\b", flags: "i" },
                { pattern: "\\b(amazing|terrible|wonderful|awful|fantastic|horrible)\\b", flags: "i" },
                { pattern: "[!]{2,}|[\\?\\!]{2,}", flags: "" },
            ],
        },
        reflective: {
            model: "reflective-optimized",
            decay_lambda: 0.001,
            weight: 0.8,
            patterns: [
                { pattern: "\\b(think|thinking|thought|reflect|reflection)\\b", flags: "i" },
                { pattern: "\\b(realize|understand|insight|conclusion|lesson)\\b", flags: "i" },
                { pattern: "\\b(why|purpose|meaning|significance|impact)\\b", flags: "i" },
                { pattern: "\\b(philosophy|wisdom|belief|value|principle)\\b", flags: "i" },
                { pattern: "\\b(should\\s+have|could\\s+have|if\\s+only|what\\s+if)\\b", flags: "i" },
            ],
        },
    };
}

/**
 * Load sector configuration from file
 * Returns compiled configuration with RegExp patterns
 */
export function load_sectors(): sectors_config {
    if (config) return config;
    
    const path = get_config_path();
    
    if (!existsSync(path)) {
        console.warn(`[SECTORS] ${path} not found, using defaults`);
        config_raw = get_defaults();
        config = compile_patterns(config_raw);
        return config;
    }

    try {
        const yml = readFileSync(path, "utf-8");
        config_raw = parse_yaml(yml);
        config = compile_patterns(config_raw);
        console.log(
            `[SECTORS] Loaded sectors.yml (${Object.keys(config).length} sectors)`,
        );
        return config;
    } catch (e) {
        console.error("[SECTORS] Failed to parse sectors.yml:", e);
        config_raw = get_defaults();
        config = compile_patterns(config_raw);
        return config;
    }
}

/**
 * Get raw (uncompiled) sector configuration
 * Useful for API responses
 */
export function get_raw_config(): sectors_config_raw {
    if (!config_raw) {
        load_sectors();
    }
    return config_raw!;
}

/**
 * Get compiled sector configuration
 */
export function get_sector_configs(): sectors_config {
    return load_sectors();
}

/**
 * Get list of sector names
 */
export function get_sectors(): string[] {
    return Object.keys(load_sectors());
}

/**
 * Get configuration for a specific sector
 */
export function get_sector(name: string): sector_cfg | undefined {
    return load_sectors()[name];
}

/**
 * Update the entire sector configuration
 * Saves to file and reloads
 */
export function update_config(new_config: sectors_config_raw): { success: boolean; error?: string } {
    try {
        // Validate the new configuration
        for (const [sector, settings] of Object.entries(new_config)) {
            if (typeof settings.model !== "string" || !settings.model) {
                return { success: false, error: `Invalid model for sector ${sector}` };
            }
            if (typeof settings.decay_lambda !== "number" || settings.decay_lambda < 0) {
                return { success: false, error: `Invalid decay_lambda for sector ${sector}` };
            }
            if (typeof settings.weight !== "number" || settings.weight <= 0) {
                return { success: false, error: `Invalid weight for sector ${sector}` };
            }
            if (!Array.isArray(settings.patterns)) {
                return { success: false, error: `Invalid patterns for sector ${sector}` };
            }
            
            // Validate each pattern
            for (const pattern of settings.patterns) {
                if (typeof pattern.pattern !== "string" || !pattern.pattern) {
                    return { success: false, error: `Invalid pattern in sector ${sector}` };
                }
                // Test that pattern compiles
                try {
                    new RegExp(pattern.pattern, pattern.flags || "");
                } catch (e) {
                    return { success: false, error: `Invalid regex pattern in sector ${sector}: ${pattern.pattern}` };
                }
            }
        }

        // Save to file
        const yml = serialize_yaml(new_config);
        const path = get_config_path();
        writeFileSync(path, yml, "utf-8");

        // Update in-memory config
        config_raw = new_config;
        config = compile_patterns(config_raw);

        console.log(`[SECTORS] Configuration updated (${Object.keys(config).length} sectors)`);
        return { success: true };
    } catch (e) {
        const error = e instanceof Error ? e.message : "Unknown error";
        console.error("[SECTORS] Failed to update configuration:", error);
        return { success: false, error };
    }
}

/**
 * Update a single sector's configuration
 */
export function update_sector(
    name: string,
    settings: Partial<sector_cfg_raw>,
): { success: boolean; error?: string } {
    const raw = get_raw_config();
    
    if (!raw[name]) {
        // Creating a new sector requires all fields
        if (!settings.model || settings.decay_lambda === undefined || 
            settings.weight === undefined || !settings.patterns) {
            return { success: false, error: `Sector ${name} does not exist and requires all fields to create` };
        }
        raw[name] = {
            model: settings.model,
            decay_lambda: settings.decay_lambda,
            weight: settings.weight,
            patterns: settings.patterns,
        };
    } else {
        // Update existing sector
        if (settings.model !== undefined) raw[name].model = settings.model;
        if (settings.decay_lambda !== undefined) raw[name].decay_lambda = settings.decay_lambda;
        if (settings.weight !== undefined) raw[name].weight = settings.weight;
        if (settings.patterns !== undefined) raw[name].patterns = settings.patterns;
    }

    return update_config(raw);
}

/**
 * Delete a sector
 */
export function delete_sector(name: string): { success: boolean; error?: string } {
    const raw = get_raw_config();
    
    if (!raw[name]) {
        return { success: false, error: `Sector ${name} does not exist` };
    }

    delete raw[name];
    return update_config(raw);
}

/**
 * Reload configuration from file
 * Use this to pick up external changes
 */
export function reload_config(): { success: boolean; sectors: string[]; error?: string } {
    try {
        config = null;
        config_raw = null;
        load_sectors();
        return { success: true, sectors: Object.keys(config!) };
    } catch (e) {
        const error = e instanceof Error ? e.message : "Unknown error";
        return { success: false, sectors: [], error };
    }
}

/**
 * Enable file watching for automatic config reload
 */
export function enable_file_watch(): void {
    if (file_watcher_enabled) return;
    
    const path = get_config_path();
    if (!existsSync(path)) return;

    watchFile(path, { interval: 5000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
            console.log("[SECTORS] Configuration file changed, reloading...");
            reload_config();
        }
    });
    
    file_watcher_enabled = true;
    console.log("[SECTORS] File watch enabled");
}

/**
 * Disable file watching
 */
export function disable_file_watch(): void {
    if (!file_watcher_enabled) return;
    
    const path = get_config_path();
    unwatchFile(path);
    
    file_watcher_enabled = false;
    console.log("[SECTORS] File watch disabled");
}
