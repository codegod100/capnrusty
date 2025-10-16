import { RpcTarget } from 'capnweb';
import * as Automerge from '@automerge/automerge';
import type { Coffee } from '$lib/data/fixtures';
import { base64ToBytes, bytesToBase64 } from '$lib/automerge/base64';
import { cloneDoc, docToCoffees, initInventoryDoc, type InventoryDoc } from '$lib/automerge/inventory';

type CoffeeListener = (items: Coffee[]) => void;
type PersistFn = (binary: Uint8Array) => Promise<void>;

interface PeerRecord {
  id: string;
  syncState: Automerge.SyncState;
  callback: ((message: string) => void) | null;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export class AutomergeInventory {
  #doc: Automerge.Doc<InventoryDoc>;
  #listeners = new Set<CoffeeListener>();
  #peers = new Map<string, PeerRecord>();
  #persist?: PersistFn;

  constructor(doc?: Automerge.Doc<InventoryDoc>, persist?: PersistFn) {
    this.#doc = doc ? cloneDoc(doc) : initInventoryDoc();
    this.#persist = persist;
  }

  static fromSeed(seed: Coffee[], persist?: PersistFn) {
    const doc = initInventoryDoc(seed);
    return new AutomergeInventory(doc, persist);
  }

  static fromBinary(binary: Uint8Array, persist?: PersistFn) {
    const doc = Automerge.load<InventoryDoc>(binary);
    return new AutomergeInventory(doc, persist);
  }

  get snapshot(): Coffee[] {
    return docToCoffees(this.#doc);
  }

  getDoc(): Automerge.Doc<InventoryDoc> {
    return this.#doc;
  }

  toBinary(): Uint8Array {
    return Automerge.save(this.#doc);
  }

  subscribe(listener: CoffeeListener): () => void {
    this.#listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  async createDemoCoffee(factory: () => Coffee): Promise<Coffee> {
    const created = factory();
    await this.mutate((doc) => {
      const copy = structuredClone(created);
      doc.coffees.splice(0, 0, copy);
    });
    return structuredClone(created);
  }

  async mutate(mutator: (doc: InventoryDoc) => void) {
    await this.#setDoc(Automerge.change(this.#doc, mutator));
  }

  getCoffee(id: string): Coffee | undefined {
    const coffees = this.#doc.coffees ?? [];
    const match = coffees.find((item) => item.id === id);
    return match ? structuredClone(match) : undefined;
  }

  registerSync(callback: (message: string) => void): SyncSession {
    const id = generateId();
    const record: PeerRecord = {
      id,
      syncState: Automerge.initSyncState(),
      callback
    };
    this.#peers.set(id, record);
    this.#flushPeer(record);
    return new SyncSession(this, id);
  }

  async receiveSyncMessage(peerId: string, messageBase64: string | null) {
    const peer = this.#peers.get(peerId);
    if (!peer) return;

    if (messageBase64) {
      const bytes = base64ToBytes(messageBase64);
      const [nextDoc, nextState] = Automerge.receiveSyncMessage(this.#doc, peer.syncState, bytes);
      peer.syncState = nextState;
      await this.#setDoc(nextDoc);
    }

    this.#flushPeer(peer);
  }

  removePeer(peerId: string) {
    this.#peers.delete(peerId);
  }

  async replaceDoc(doc: Automerge.Doc<InventoryDoc>) {
    await this.#setDoc(doc);
  }

  async #setDoc(nextDoc: Automerge.Doc<InventoryDoc>) {
    if (nextDoc === this.#doc) {
      return;
    }
    this.#doc = nextDoc;
    if (this.#persist) {
      await this.#persist(Automerge.save(this.#doc));
    }
    this.#notifyListeners();
    this.#flushAllPeers();
  }

  #notifyListeners() {
    const snapshot = this.snapshot;
    for (const listener of this.#listeners) {
      listener(snapshot);
    }
  }

  #flushAllPeers() {
    for (const peer of this.#peers.values()) {
      this.#flushPeer(peer);
    }
  }

  #flushPeer(peer: PeerRecord) {
    if (!peer.callback) return;
    let syncState = peer.syncState;
    let message: Uint8Array | null;

    do {
      [syncState, message] = Automerge.generateSyncMessage(this.#doc, syncState);
      peer.syncState = syncState;
      if (message) {
        peer.callback(bytesToBase64(message));
      }
    } while (message);
  }
}

export class SyncSession extends RpcTarget {
  #inventory: AutomergeInventory;
  #id: string;
  #closed = false;

  constructor(inventory: AutomergeInventory, id: string) {
    super();
    this.#inventory = inventory;
    this.#id = id;
  }

  async send(messageBase64: string | null) {
    if (this.#closed) return;
    await this.#inventory.receiveSyncMessage(this.#id, messageBase64);
  }

  close() {
    if (this.#closed) return;
    this.#closed = true;
    this.#inventory.removePeer(this.#id);
  }
}
