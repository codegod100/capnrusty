# Development Workflow

Follow these steps to work with the Automerge-enabled stack.

## Local mock loop

1. Install dependencies (requires online registry access):
   ```bash
   pnpm install
   ```
2. Start the SvelteKit dev server:
   ```bash
   pnpm dev
   ```
   The mock Cap'n Web server launches automatically and exposes `/rpc` on port `8787`.
3. Open `http://localhost:5173` and click **Brew a demo coffee** to see Automerge updates propagate.

## Durable Object testing

1. Produce a static build:
   ```bash
   pnpm build
   ```
2. Run Wrangler locally:
   ```bash
   pnpm wrangler dev --local --port 8787
   ```
3. Visit `http://127.0.0.1:8787/` to use the Svelte bundle backed by the Durable Object.

## Useful references

- `src/lib/stores/coffee.ts` – client sync implementation.
- `src/lib/server/automergeInventory.ts` – shared server-side Automerge utility.
- `src/worker/capnweb-worker.ts` – Durable Object wrapper.
- `src/lib/server/mockInventoryServer.ts` – development server wrapper.

To rebuild the docs themselves:

```bash
cd docs
mdbook build   # or mdbook serve
```

The generated output lands in `docs/book`, following mdBook defaults.
