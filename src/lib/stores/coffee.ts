import { browser } from '$app/environment';
import { readable } from 'svelte/store';
import { newWebSocketRpcSession } from 'capnweb';
import type { Coffee } from '$lib/data/fixtures';
import type { CoffeeInventoryApi, CoffeeSubscription } from '$lib/types/inventory';

const API_PATH = '/rpc';

function resolveWebSocketUrl(): string | null {
  if (!browser) return null;
  const configured = import.meta.env.VITE_CAPNWEB_WS as string | undefined;
  if (configured) return configured;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const portOverride = import.meta.env.VITE_CAPNWEB_PORT as string | undefined;
  const hostPort =
    portOverride && portOverride.length > 0
      ? `${window.location.hostname}:${portOverride}`
      : window.location.host;

  return `${protocol}//${hostPort}${API_PATH}`;
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

  async function connect() {
    try {
      const rpc = newWebSocketRpcSession<CoffeeInventoryApi>(endpoint);
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
    }
  }

  void connect();

  return () => {
    closed = true;
    subscription?.close();
  };
});
