import { browser } from '$app/environment';
import { readable } from 'svelte/store';
import { newWebSocketRpcSession } from 'capnweb';
import type { Coffee } from '$lib/data/fixtures';
import type { CoffeeInventoryApi, CoffeeSubscription } from '$lib/types/inventory';

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
  let subscription: CoffeeSubscription | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  async function connect() {
    try {
      const rpc = newWebSocketRpcSession<CoffeeInventoryApi>(endpoint);
      clientStub = rpc;
      const initial = await rpc.listCoffees();
      if (!closed) {
        set(initial);
      }

      subscription = await rpc.subscribeToCoffees((updated) => {
        if (!closed) {
          set(updated);
        }
      });
    } catch (err) {
      console.error('Failed to connect to Cap\'n Web endpoint.', err);
      clientStub = null;
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
