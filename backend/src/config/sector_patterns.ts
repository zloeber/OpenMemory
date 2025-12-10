import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { env } from "../core/cfg";

const fallbackPatterns: Record<string, RegExp[]> = {
    episodic: [
        /\b(today|yesterday|last\s+week|remember\s+when|that\s+time)\b/i,
        /\b(I\s+(did|went|saw|met|felt))\b/i,
        /\b(at\s+\d+:\d+|on\s+\w+day|in\s+\d{4})\b/i,
        /\b(happened|occurred|experience|event|moment)\b/i,
    ],
    semantic: [
        /\b(define|definition|meaning|concept|theory)\b/i,
        /\b(what\s+is|how\s+does|why\s+do|facts?\s+about)\b/i,
        /\b(principle|rule|law|algorithm|method)\b/i,
        /\b(knowledge|information|data|research|study)\b/i,
    ],
    procedural: [
        /\b(how\s+to|step\s+by\s+step|procedure|process)\b/i,
        /\b(first|then|next|finally|afterwards)\b/i,
        /\b(install|configure|setup|run|execute)\b/i,
        /\b(tutorial|guide|instructions|manual)\b/i,
        /\b(click|press|type|enter|select)\b/i,
    ],
    emotional: [
        /\b(feel|feeling|felt|emotion|mood)\b/i,
        /\b(happy|sad|angry|excited|worried|anxious|calm)\b/i,
        /\b(love|hate|like|dislike|enjoy|fear)\b/i,
        /\b(amazing|terrible|wonderful|awful|fantastic|horrible)\b/i,
        /[!]{2,}|[\?!]{2,}/,
    ],
    reflective: [
        /\b(think|thinking|thought|reflect|reflection)\b/i,
        /\b(realize|understand|insight|conclusion|lesson)\b/i,
        /\b(why|purpose|meaning|significance|impact)\b/i,
        /\b(philosophy|wisdom|belief|value|principle)\b/i,
        /\b(should\s+have|could\s+have|if\s+only|what\s+if)\b/i,
    ],
};

let cachedPatterns: Record<string, RegExp[]> | null = null;

function parseRegexLiteral(literal: string, sector: string, index: number): RegExp | null {
    const trimmed = literal.trim();
    const firstSlash = trimmed.indexOf("/");
    const lastSlash = trimmed.lastIndexOf("/");

    if (firstSlash !== 0 || lastSlash <= firstSlash) {
        console.error(
            `[SECTOR PATTERNS] Invalid regex literal for sector "${sector}" at index ${index}: ${literal}`,
        );
        return null;
    }

    const pattern = trimmed.slice(firstSlash + 1, lastSlash);
    const flags = trimmed.slice(lastSlash + 1);

    try {
        return new RegExp(pattern, flags);
    } catch (error) {
        console.error(
            `[SECTOR PATTERNS] Failed to compile regex for sector "${sector}" at index ${index}: ${(error as Error).message}`,
        );
        return null;
    }
}

function loadPatternsFromFile(filePath: string): Record<string, RegExp[]> {
    try {
        const resolved = path.resolve(filePath);
        if (!fs.existsSync(resolved)) {
            console.warn(
                `[SECTOR PATTERNS] Configuration file not found at ${resolved}. Falling back to built-in defaults.`,
            );
            return {};
        }

        const contents = fs.readFileSync(resolved, "utf8");
        const parsed = parse(contents) as Record<string, Array<{ pattern: string }>>;
        const result: Record<string, RegExp[]> = {};

        for (const [sector, entries] of Object.entries(parsed || {})) {
            if (!Array.isArray(entries)) continue;
            const patterns: RegExp[] = [];
            entries.forEach((entry, index) => {
                if (!entry || typeof entry.pattern !== "string") return;
                const compiled = parseRegexLiteral(entry.pattern, sector, index);
                if (compiled) patterns.push(compiled);
            });
            if (patterns.length > 0) {
                result[sector] = patterns;
            }
        }

        return result;
    } catch (error) {
        console.error(
            `[SECTOR PATTERNS] Failed to load configuration from ${filePath}: ${(error as Error).message}`,
        );
        return {};
    }
}

function mergePatterns(
    overrides: Record<string, RegExp[]>,
    defaults: Record<string, RegExp[]>,
): Record<string, RegExp[]> {
    const merged: Record<string, RegExp[]> = {};

    const sectors = new Set<string>([
        ...Object.keys(defaults),
        ...Object.keys(overrides),
    ]);

    sectors.forEach((sector) => {
        if (overrides[sector] && overrides[sector].length > 0) {
            merged[sector] = overrides[sector];
        } else if (defaults[sector]) {
            merged[sector] = defaults[sector];
        }
    });

    return merged;
}

export function getSectorPatterns(): Record<string, RegExp[]> {
    if (cachedPatterns) return cachedPatterns;

    const overrides = loadPatternsFromFile(env.sector_pattern_file);
    cachedPatterns = mergePatterns(overrides, fallbackPatterns);
    return cachedPatterns;
}
