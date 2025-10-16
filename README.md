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

1. Build the SvelteKit assets (Wrangler serves the output of `.svelte-kit/output/client`):
   ```bash
   pnpm build
   ```
2. Run Wrangler to host the Worker, Durable Object, and built client bundle:
 ```bash
 pnpm wrangler dev --local --port 8787
 ```
   Visit http://127.0.0.1:8787/ to load the bundled UI and interact with the real Durable Object.

> **Note:** On the Cloudflare free plan, Durable Object migrations must use `new_sqlite_classes`. The
> default Wrangler config already does this (`wrangler.toml`). If you rename the class or add new
> migrations, keep the `new_sqlite_classes` format so deployment succeeds.

## Configuration

- `VITE_CAPNWEB_PORT` – override the port that the mock server or Wrangler listens on (default `8787`).
- `VITE_CAPNWEB_WS` – provide a full WebSocket URL if the client should connect to a remote RPC
  endpoint instead of the locally managed instance. Supplying this also disables the mock server.
- `CAPNWEB_USE_DURABLE=true` – run SvelteKit against a real Durable Object even in dev (mock server will
  remain off; point `VITE_CAPNWEB_WS` at your Worker).

## Automerge sync

Inventory state is replicated with [Automerge](https://automerge.org/) so multiple peers (browser, mock
server, Durable Object) converge automatically:

- The mock Node server and the Durable Object both host an Automerge document and expose a Cap'n Web RPC
  method `openSyncChannel`.
- The browser keeps its own local Automerge doc (`src/lib/stores/coffee.ts`) and exchanges sync messages
  over the existing WebSocket session. Initial state and subsequent edits are streamed as CRDT sync
  messages, so the UI updates immediately without polling.
- When you call `createDemoCoffee`, the server mutates the Automerge doc and broadcasts the resulting
  sync messages; every connected client receives the update and merges it into their local document.

## Project documentation

Additional notes on the Automerge integration live in the mdBook project under `docs/`:

```bash
cd docs
mdbook serve --open
```

The book covers the architecture, client/server flows, and development workflow in greater detail.

## Building and previewing

```bash
pnpm build
pnpm preview
```

Both commands require the RPC server to be reachable at runtime. For production, deploy
`src/worker/capnweb-worker.ts` (and the `CoffeeInventoryDurable` Durable Object) with Wrangler or
your Cloudflare CI pipeline, then serve the built SvelteKit output with any adapter that forwards
`/rpc` traffic to the Worker.
