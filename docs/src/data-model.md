# Data Model & Persistence

The Automerge document schema lives in `src/lib/automerge/inventory.ts`:

```ts
export interface InventoryDoc {
  coffees: Coffee[];
}
```

Each `Coffee` comes from `src/lib/data/fixtures.ts`. Operations that mutate the document always use `structuredClone` to avoid lingering references.

Persistence story:

- **Mock server** – purely in-memory. Restarting `pnpm dev` resets to fixture data.
- **Durable Object** – persists the Automerge binary (`Automerge.save(doc)`) in Durable Object storage under the key `doc`. On first boot, it seeds from fixtures and immediately saves the snapshot.
- **Browser** – currently ephemeral, but it is straightforward to cache `Automerge.save(doc)` into IndexedDB or LocalStorage inside the client store if you wish to support offline resumption.

Because Automerge encodes intent in change messages, you should favour `Automerge.change` for any state modifications to keep the mutation log intact. Always mutate inside the `AutomergeInventory.mutate` helper so listeners and peers are notified uniformly.
