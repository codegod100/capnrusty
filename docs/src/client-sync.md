# Client Synchronisation Flow

The browser integrates Automerge inside a Svelte store (`src/lib/stores/coffee.ts`). The critical steps are:

1. **Open Cap'n Web session**  
   ```ts
   const rpc = newWebSocketRpcSession<CoffeeInventoryApi>(endpoint);
   session = await rpc.openSyncChannel(handleSyncMessage);
   ```
   `openSyncChannel` returns a Cap'n Web proxy that forwards encoded Automerge messages to the server.

2. **Seed the local document**  
   The client pulls the initial snapshot with `rpc.listCoffees()` and turns it into a fresh Automerge document. It also subscribes to the traditional `subscribeToCoffees` RPC so it can recover quickly if the sync channel hiccups.

3. **Process incoming messages**  
   ```ts
   const bytes = base64ToBytes(encoded);
   [doc, syncState] = Automerge.receiveSyncMessage(doc, syncState, bytes);
   ```
   Every received message updates the local document and triggers a store update.

4. **Flush outbound messages**  
   Whenever the document mutates locally (for example, after brewing a demo coffee), `Automerge.generateSyncMessage` produces zero or more messages. Each one is base64-encoded and sent through the Cap'n Web sync session.

5. **Expose a Svelte-readable store**  
   `docToCoffees(doc)` translates the Automerge document into plain `Coffee[]` data that powers the rune-based page (`src/routes/+page.svelte`).

Because everything lives inside a readable store, components only need to subscribe once to remain up-to-date.
