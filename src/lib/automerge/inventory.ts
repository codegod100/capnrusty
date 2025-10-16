import * as Automerge from '@automerge/automerge';
import type { Coffee } from '$lib/data/fixtures';

export interface InventoryDoc {
  coffees: Coffee[];
}

export function initInventoryDoc(seed: Coffee[] = []): Automerge.Doc<InventoryDoc> {
  return Automerge.from<InventoryDoc>({
    coffees: seed.map((coffee) => structuredClone(coffee))
  });
}

export function docToCoffees(doc: Automerge.Doc<InventoryDoc>): Coffee[] {
  const coffees = doc.coffees ?? [];
  return coffees.map((coffee) => structuredClone(coffee));
}

export function cloneDoc(doc: Automerge.Doc<InventoryDoc>): Automerge.Doc<InventoryDoc> {
  return Automerge.clone(doc);
}
