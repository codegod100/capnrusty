# Server Implementations

Both back ends expose the same Cap'n Web surface. Their responsibilities:

## Mock Node server

- **File**: `src/lib/server/mockInventoryServer.ts`
- **Runtime**: Spins up during `pnpm dev`.
- **Transport**: Node `http` + `ws` packages.
- **State**: In-memory Automerge document seeded with fixture data.
- **Methods**:
  - `listCoffees`, `getCoffee`, `subscribeToCoffees`: for compatibility with pre-Automerge flows.
  - `createDemoCoffee`: mutates the document using `AutomergeInventory#createDemoCoffee`.
  - `openSyncChannel`: registers a new Automerge sync peer via `AutomergeInventory#registerSync`.
  - `bumpRandomStock`: periodic Automerge mutation to simulate activity.

## Cloudflare Durable Object

- **Files**: `src/worker/capnweb-worker.ts`, `wrangler.toml`.
- **Runtime**: Cloudflare Workers with a `CoffeeInventoryDurable` Durable Object.
- **State**:
  - Automerge document persisted via `DurableObjectStorage.put('doc', binary)`.
  - Auto-scheduled alarms tick every eight seconds to adjust stock amounts.
- **Static assets**: Wrangler serves Svelte's `build/` output (`[assets]` binding).
- **RPC methods** mirror the mock server; responses are proxied through `newWorkersRpcResponse`.

Because both servers rely on the shared `AutomergeInventory` class, adding new operations (e.g. edit coffee metadata) only requires touching one place—`AutomergeInventory.mutate`.
