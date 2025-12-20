const server = require("./server.js");
import { env, tier } from "../core/cfg";
import { run_decay_process, prune_weak_waypoints } from "../memory/hsg";
import { mcp } from "../ai/mcp";
import { routes } from "./routes";
import {
    authenticate_api_request,
    log_authenticated_request,
} from "./middleware/auth";
import { start_reflection } from "../memory/reflect";
import { start_user_summary_reflection } from "../memory/user_summary";
import { sendTelemetry } from "../core/telemetry";
import { req_tracker_mw } from "./routes/dashboard";

const ASC = `   ____                   __  __                                 
  / __ \\                 |  \\/  |                                
 | |  | |_ __   ___ _ __ | \\  / | ___ _ __ ___   ___  _ __ _   _ 
 | |  | | '_ \\ / _ \\ '_ \\| |\\/| |/ _ \\ '_ \` _ \\ / _ \\| '__| | | |
 | |__| | |_) |  __/ | | | |  | |  __/ | | | | | (_) | |  | |_| |
  \\____/| .__/ \\___|_| |_|_|  |_|\\___|_| |_| |_|\\___/|_|   \\__, |
        | |                                                 __/ |
        |_|                                                |___/ `;

const app = server({ max_payload_size: env.max_payload_size });

console.log(ASC);
console.log(`[CONFIG] Vector Dimension: ${env.vec_dim}`);
console.log(`[CONFIG] Cache Segments: ${env.cache_segments}`);
console.log(`[CONFIG] Max Active Queries: ${env.max_active}`);
console.log(`[CONFIG] Embedding Kind: ${env.emb_kind}`);
console.log(`[CONFIG] Server Mode: ${env.mode}`);
console.log(`[CONFIG] Decay Interval: ${env.decay_interval_minutes} minutes`);
console.log(`[CONFIG] Decay Initial Delay: ${env.decay_initial_delay_ms} ms`);
console.log(`[CONFIG] Decay Enabled: ${env.decay_enabled ? "Yes" : "No"}`);
console.log(`[CONFIG] Metadata Backend: ${env.metadata_backend}`);
console.log(`[CONFIG] Vector Backend: ${env.vector_backend}`);
console.log(`[CONFIG] IDE Mode: ${env.ide_mode ? "Enabled" : "Disabled"}`);
console.log(`[CONFIG] Swagger: ${env.swagger_enabled ? "Enabled" : "Disabled"}`);
console.log(`[CONFIG] Swagger URL: ${env.swagger_enabled ? "/api-docs" : "Disabled"}`);

// Warn about configuration mismatch that causes embedding incompatibility
if (env.emb_kind !== "synthetic" && (tier === "hybrid" || tier === "fast")) {
    console.warn(
        `[CONFIG] ⚠️  WARNING: Embedding configuration mismatch detected!\n` +
        `         OM_EMBEDDINGS=${env.emb_kind} but OM_TIER=${tier}\n` +
        `         Storage will use ${env.emb_kind} embeddings, but queries will use synthetic embeddings.\n` +
        `         This causes semantic search to fail. Set OM_TIER=deep to fix.`
    );
}

app.use(req_tracker_mw());

app.use((req: any, res: any, next: any) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization,x-api-key",
    );
    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }
    next();
});

app.use(authenticate_api_request);

if (process.env.OM_LOG_AUTH === "true") {
    app.use(log_authenticated_request);
}

routes(app);

mcp(app);
if (env.mode === "langgraph") {
    console.log("[MODE] LangGraph integration enabled");
}

const decayIntervalMs = env.decay_interval_minutes * 60 * 1000;
if (env.decay_enabled) {
    console.log(
        `[DECAY] Interval: ${env.decay_interval_minutes} minutes (${decayIntervalMs / 1000}s)`,
    );

    setInterval(async () => {
        console.log("[DECAY] Running HSG decay process...");
        try {
            const result = await run_decay_process();
            console.log(
                `[DECAY] Completed: ${result.decayed}/${result.processed} memories updated`,
            );
        } catch (error) {
            console.error("[DECAY] Process failed:", error);
        }
    }, decayIntervalMs);
} else {
    console.log("[DECAY] Automatic decay disabled; skipping scheduler");
}
setInterval(
    async () => {
        console.log("[PRUNE] Pruning weak waypoints...");
        try {
            const pruned = await prune_weak_waypoints();
            console.log(`[PRUNE] Completed: ${pruned} waypoints removed`);
        } catch (error) {
            console.error("[PRUNE] Failed:", error);
        }
    },
    7 * 24 * 60 * 60 * 1000,
);
if (env.decay_enabled) {
    const initialDecayDelayMs = env.decay_initial_delay_ms;
    if (initialDecayDelayMs > 0) {
        console.log(
            `[INIT] Waiting ${initialDecayDelayMs}ms before initial decay run...`,
        );
    }

    setTimeout(() => {
        run_decay_process()
            .then((result: any) => {
                console.log(
                    `[INIT] Initial decay: ${result.decayed}/${result.processed} memories updated`,
                );
            })
            .catch((error: unknown) => {
                console.error("[INIT] Initial decay failed:", error);
            });
    }, initialDecayDelayMs);
}

start_reflection();
start_user_summary_reflection();

console.log(`[SERVER] Starting on port ${env.port}`);
app.listen(env.port, () => {
    console.log(`[SERVER] Running on http://localhost:${env.port}`);
    sendTelemetry().catch(() => {
        // ignore telemetry failures
    });
});
