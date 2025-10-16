# Automerge Architecture

The project organises Automerge state around a single document that encapsulates the coffee inventory. The workflow looks like this:

```
[Browser] <--Cap'n Web / WebSocket--> [Server API] <---> [Automerge Document]
                                                     |
                                                     +--> Durable Object storage (prod)
                                                     +--> In-memory mock store (dev)
```

Key components:

- **Shared helpers** – `src/lib/automerge/` exposes utility functions that create, clone, and serialise the inventory document.
- **Server orchestration** – `src/lib/server/automergeInventory.ts` provides the `AutomergeInventory` class. It owns the authoritative document, fans out listener updates, and manages sync sessions for each connected peer.
- **Transports** – Both the in-process mock server (`src/lib/server/mockInventoryServer.ts`) and the Cloudflare Worker (`src/worker/capnweb-worker.ts`) wrap `AutomergeInventory` in Cap'n Web RPC targets. Each exposes identical methods so the browser can switch environments without code changes.
- **Client state** – `src/lib/stores/coffee.ts` keeps a local Automerge document, synchronises it through Cap'n Web, and converts it to a Svelte store that drives the UI.

Because Automerge is transport agnostic, Cap'n Web simply carries base64-encoded sync messages. The connection is long-lived (WebSocket) which allows low-latency updates when stock changes or new coffees are brewed. Should you need HTTP batching, the same message payloads can be exchanged over `fetch` as well.
