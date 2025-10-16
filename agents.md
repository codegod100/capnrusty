# Agent Notes

- Adopted Svelte runes (Svelte 5) throughout the UI; prefer `$state`, `$derived`, and `$effect` for future component state management.
- Cap'n Web backend now runs in `src/worker/capnweb-worker.ts` with a `CoffeeInventoryDurable` Durable Object; persist coffee changes there instead of local Node helpers.
- SvelteKit dev (`pnpm dev`) auto-starts the mock RPC server via `ensureMockInventoryServer()`; set `CAPNWEB_USE_DURABLE=true` or `VITE_CAPNWEB_WS` to talk to a real Worker instead.
