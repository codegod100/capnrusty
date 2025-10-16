# Cap'n Web + SvelteKit Playground

This project demonstrates a SvelteKit front end that consumes fixture data exposed through a
[Cap'n Web](https://github.com/cloudflare/capnweb) RPC server running over WebSocket. The RPC server
streams live updates (simulated inventory changes) to the browser so the dashboard stays in sync.

## Getting started

1. Install dependencies (includes `capnweb` and `ws`):
   ```bash
   pnpm install
   ```
2. Start the SvelteKit dev server — it boots the Cap'n Web RPC server automatically on port `8787`:
   ```bash
   pnpm dev
   ```
3. Open the app and watch inventory stock counts tick in real time. The front end subscribes to
   `capnweb` updates via a WebSocket session and updates the Svelte store reactively.

## Configuration

- `VITE_CAPNWEB_PORT` – override the port the RPC server listens on (default `8787`).
- `VITE_CAPNWEB_WS` – provide a full WebSocket URL if the client should connect to a remote RPC
  endpoint instead of the local helper server.

## Building and previewing

```bash
pnpm build
pnpm preview
```

Both commands require the RPC server to be reachable at runtime. In production you can run the
generated `node` server (`src/lib/server/capnwebServer.ts`) alongside any platform that serves the
built SvelteKit output.
