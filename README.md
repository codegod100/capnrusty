# Cap'n Web + SvelteKit Playground

This project demonstrates a SvelteKit front end that consumes fixture data exposed through a
[Cap'n Web](https://github.com/cloudflare/capnweb) RPC server running over WebSocket. The RPC server
streams live updates (simulated inventory changes) to the browser so the dashboard stays in sync.

## Getting started

1. Install dependencies (includes `capnweb` and `ws`):
   ```bash
   pnpm install
   ```
2. Local iteration (mock durable object): just run the SvelteKit dev server. It spins up an in-memory
   Cap'n Web server under the hood, so you can hot-reload UI changes without a Wrangler build step.
   ```bash
   pnpm dev
   ```
3. Open the app and watch inventory stock counts tick in real time. The front end subscribes to
   `capnweb` updates via a WebSocket session and updates the Svelte store reactively.

### Using the real Durable Object locally

When you want to exercise the Cloudflare Durable Object implementation:

1. Build the static Svelte assets (Wrangler serves the output of `pnpm build`):
   ```bash
   pnpm build
   ```
2. Run Wrangler in a second terminal to serve both the assets and the `/rpc` endpoint:
   ```bash
   pnpm wrangler dev --local --port 8787
   ```
3. In another terminal, run the SvelteKit preview server or deploy the built assets with your adapter.

## Configuration

- `VITE_CAPNWEB_PORT` – override the port that the mock server or Wrangler listens on (default `8787`).
- `VITE_CAPNWEB_WS` – provide a full WebSocket URL if the client should connect to a remote RPC
  endpoint instead of the locally managed instance. Supplying this also disables the mock server.
- `CAPNWEB_USE_DURABLE=true` – run SvelteKit against a real Durable Object even in dev (mock server will
  remain off; point `VITE_CAPNWEB_WS` at your Worker).

## Building and previewing

```bash
pnpm build
pnpm preview
```

Both commands require the RPC server to be reachable at runtime. For production, deploy
`src/worker/capnweb-worker.ts` (and the `CoffeeInventoryDurable` Durable Object) with Wrangler or
your Cloudflare CI pipeline, then serve the built SvelteKit output with any adapter that forwards
`/rpc` traffic to the Worker.
