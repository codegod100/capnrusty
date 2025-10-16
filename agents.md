# Agent Notes

- Adopted Svelte runes (Svelte 5) throughout the UI; prefer `$state`, `$derived`, and `$effect` for future component state management.
- Cap'n Web backend now runs in `src/worker/capnweb-worker.ts` with a `CoffeeInventoryDurable` Durable Object; persist coffee changes there instead of local Node helpers. Static Svelte output is generated with `adapter-static` (see `svelte.config.js`).
- SvelteKit dev (`pnpm dev`) auto-starts the mock RPC server via `ensureMockInventoryServer()`; set `CAPNWEB_USE_DURABLE=true` or `VITE_CAPNWEB_WS` to talk to a real Worker instead.
- For Wrangler flows, run `pnpm build` before `pnpm wrangler dev`; the Worker serves `.svelte-kit/output/client` via the `STATIC_CONTENT` asset binding, uses `new_sqlite_classes` migrations to satisfy the Cloudflare free-plan Durable Object requirement, and relies on Automerge sync (`openSyncChannel`) for state replication.
