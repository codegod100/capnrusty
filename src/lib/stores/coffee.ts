import { browser } from '$app/environment';
import { readable } from 'svelte/store';
import { newWebSocketRpcSession } from 'capnweb';
import * as Automerge from '@automerge/automerge';
import type { Coffee } from '$lib/data/fixtures';
import type { CoffeeInventoryApi, CoffeeSyncSession, CoffeeSubscription } from '$lib/types/inventory';
import { base64ToBytes, bytesToBase64 } from '$lib/automerge/base64';
import { docToCoffees, initInventoryDoc } from '$lib/automerge/inventory';

const API_PATH = '/rpc';
let clientStub: CoffeeInventoryApi | null = null;

function resolveWebSocketUrl(): string | null {
  if (!browser) return null;
  const configured = import.meta.env.VITE_CAPNWEB_WS as string | undefined;
  if (configured) return configured;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const portOverride = import.meta.env.VITE_CAPNWEB_PORT as string | undefined;

  if (import.meta.env.DEV) {
    if (portOverride && portOverride.length > 0) {
      return `${protocol}//${window.location.hostname}:${portOverride}${API_PATH}`;
    }
    return `${protocol}//${window.location.host}${API_PATH}`;
  }

  if (portOverride && portOverride.length > 0) {
    return `${protocol}//${window.location.hostname}:${portOverride}${API_PATH}`;
  }

  return `${protocol}//${window.location.host}${API_PATH}`;
}

export const coffeesStore = readable<Coffee[]>([], (set) => {
  if (!browser) {
    return () => {};
  }

  const endpoint = resolveWebSocketUrl();
  if (!endpoint) {
    return () => {};
  }

  let closed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let session: CoffeeSyncSession | null = null;
  let subscription: CoffeeSubscription | null = null;
  let doc = initInventoryDoc();
  let syncState = Automerge.initSyncState();

  const updateSnapshot = () => {
    if (!closed) {
      set(docToCoffees(doc));
    }
  };

  const handleSyncMessage = (encoded: string) => {
    if (closed) return;
    try {
      const bytes = base64ToBytes(encoded);
      [doc, syncState] = Automerge.receiveSyncMessage(doc, syncState, bytes);
      updateSnapshot();
      void flushOutgoing();
    } catch (error) {
      console.error('Failed to process Automerge sync message.', error);
    }
  };

  const flushOutgoing = async () => {
    if (!session) return;
    let message: Uint8Array | null;
    do {
      [syncState, message] = Automerge.generateSyncMessage(doc, syncState);
      if (message) {
        try {
          await session.send(bytesToBase64(message));
        } catch (error) {
          console.error('Failed to send Automerge sync message.', error);
          break;
        }
      }
    } while (message);
  };

  async function connect() {
    try {
      const rpc = newWebSocketRpcSession<CoffeeInventoryApi>(endpoint);
      clientStub = rpc;
      session = await rpc.openSyncChannel(handleSyncMessage);

      const initial = await rpc.listCoffees();
      doc = Automerge.from({ coffees: initial.map((coffee) => structuredClone(coffee)) });
      syncState = Automerge.initSyncState();
      updateSnapshot();
      await flushOutgoing();

      subscription = await rpc.subscribeToCoffees((updated) => {
        doc = Automerge.from({ coffees: updated.map((coffee) => structuredClone(coffee)) });
        syncState = Automerge.initSyncState();
        updateSnapshot();
      });
    } catch (err) {
      console.error('Failed to connect to Cap\'n Web endpoint.', err);
      clientStub = null;
      session = null;
      doc = initInventoryDoc();
      syncState = Automerge.initSyncState();
      if (!closed) {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          void connect();
        }, 2000);
      }
    }
  }

  void connect();

  return () => {
    closed = true;
    session?.close();
    subscription?.close();
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    clientStub = null;
  };
});

export async function createDemoCoffee() {
  if (!clientStub) {
    throw new Error('Inventory service is still connecting. Please try again in a moment.');
  }
  return clientStub.createDemoCoffee();
}
