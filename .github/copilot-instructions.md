## Big Picture
- `backend/` runs the Hierarchical Sector Graph (HSG) engine with both REST and MCP servers; `dashboard/` is the Next.js UI; `sdk-js/` and `sdk-py/` bundle the standalone engine.
- Core flows: `/memory/add` → `add_hsg_memory` (sector classification, embeddings, waypoints) and `/memory/query` → `hsg_query` (sector search, waypoint expansion, reinforcement).
- Temporal reasoning lives in `backend/src/temporal_graph/` with REST wrappers in `backend/src/server/routes/temporal.ts` and ships with every deployment.
- Background automation (decay, waypoint pruning, reflections, user summaries) starts in `backend/src/server/index.ts` once the server boots.

## Backend Workflow
- The HTTP server is the lightweight framework in `backend/src/server/server.js`; routes sit under `backend/src/server/routes/` and must register via `app.get/post/...`.
- Shared middleware (API key auth, rate limiting, request tracking) is wired in `backend/src/server/index.ts`; new protected endpoints must execute after `authenticate_api_request`.
- Database access goes through the `q`, `run_async`, `transaction`, etc. helpers in `backend/src/core/db.ts`, which abstract SQLite vs Postgres.
- Vector operations must use the `vector_store` interface (`backend/src/core/vector_store.ts`) so Postgres and Valkey backends stay swappable.

## Memory Engine
- Sector configuration, scoring weights, and decay math live in `backend/src/memory/hsg.ts`; keep `sector_configs` and scoring constants in sync when adding sectors or weights.
- `add_hsg_memory` encapsulates dedupe via simhash, chunking, multi-provider embeddings, mean vectors, and waypoint creation—call it instead of writing to tables directly.
- `hsg_query` handles multi-sector ANN search, waypoint expansion (`expand_via_waypoints`), recency/keyword/tag scoring, and reinforcement; extend it via the filters object rather than rewriting the algorithm.
- Scheduled jobs (`run_decay_process`, `start_reflection`, `start_user_summary_reflection`) rely on salience, segment, and stats tables defined in `backend/src/core/db.ts`; update both SQLite and Postgres branches when changing schema.

## Config & Environment
- Environment parsing is centralized in `backend/src/core/cfg.ts`; update it (and `.env.example`) whenever you introduce new toggles so `env` remains authoritative.
- `OM_TIER` selects default vector dimensions/cache sizes (fast/smart/deep/hybrid); mismatching it with `OM_EMBEDDINGS` triggers the warning emitted in `server/index.ts`.
- Metadata storage defaults to SQLite (`OM_METADATA_BACKEND=sqlite`) while vectors default to Postgres semantics (`OM_VECTOR_BACKEND=postgres`); both share the `vector_store` API and can run fully on SQLite.
- Set `OM_API_KEY` for mutating endpoints; tests and the dashboard send it via `Authorization: Bearer` or `x-api-key`; rate limits derive from the `OM_RATE_LIMIT_*` knobs.
- Embedding providers are pluggable (`OM_EMBEDDINGS`, `OM_EMBEDDING_FALLBACK`); extend `backend/src/memory/embed.ts` and `core/models.ts` together so fallback chains and timeouts keep working.

## Dashboards & Integrations
- The MCP server is defined in `backend/src/ai/mcp.ts`; add tools/resources there and expose them via `mcp(app)`.
- The dashboard expects `NEXT_PUBLIC_API_URL` (and optional `NEXT_PUBLIC_API_KEY`); request helpers live in `dashboard/lib/api.ts` and mirror the backend routes.
- IDE telemetry endpoints (`/api/ide/*` in `backend/src/server/routes/ide.ts`) reuse `add_hsg_memory`; preserve metadata keys like `ide_session_id` when emitting session summaries.
- Temporal knowledge graph APIs (`/api/temporal/*`) wrap `temporal_graph/` helpers and assume the `temporal_facts`/`temporal_edges` tables created in `core/db.ts` exist regardless of engine.

## Testing & Tooling
- Run the backend locally with `cd backend && npm run dev` (tsx entry); production builds use `npm run build && npm start`.
- Integration smoke tests live in `tests/backend/api.test.js`; start the server, export `OM_API_KEY`, then run `node tests/backend/api.test.js`.
- Make targets (`make dev`, `make test`, `make docker-dev`) orchestrate backend + SDK workflows; extend the Makefile if you add cross-component commands.
- The `opm` CLI (`backend/bin/opm.js`) is linked via `npm link`; keep CLI behavior aligned with REST semantics so examples in `examples/` stay accurate.

## Conventions & Pitfalls
- Avoid logging to stdout from background jobs that may run under MCP; follow existing patterns that ship debug output to `console.error`.
- Use `req_tracker_mw` and `log_maint_op` when adding new request types or maintenance work so dashboard metrics remain valid.
- When touching embeddings, honor chunking, fallback chains, and `embed_delay_ms` in `backend/src/memory/embed.ts` to preserve rate-limit resilience.
- Schema changes must update both database branches in `backend/src/core/db.ts` and maintain the `vector_store` contract.
- Auto-reflection and consolidation rely on `extract_essence` and `meta.consolidated`; mark derived memories accordingly to prevent duplicate work.
