import { RpcTarget, newWorkersRpcResponse } from 'capnweb';
import type {
  DurableObjectNamespace,
  DurableObjectState,
  Fetcher
} from '@cloudflare/workers-types';
import { coffees as seedCoffees, type Coffee } from '$lib/data/fixtures';
import { generateCoffee } from '$lib/server/coffeeGenerator';
import { AutomergeInventory, SyncSession } from '$lib/server/automergeInventory';
import type { CoffeeNotificationTarget } from '$lib/types/inventory';

class Subscription extends RpcTarget {
  #dispose: () => void;

  constructor(dispose: () => void) {
    super();
    this.#dispose = dispose;
  }

  close() {
    this.#dispose();
  }
}

class InventoryApi extends RpcTarget {
  #inventory: AutomergeInventory;

  constructor(inventory: AutomergeInventory) {
    super();
    this.#inventory = inventory;
  }

  async listCoffees(): Promise<Coffee[]> {
    return this.#inventory.snapshot;
  }

  async getCoffee(id: string): Promise<Coffee | undefined> {
    return this.#inventory.getCoffee(id);
  }

  async subscribeToCoffees(listener: (items: Coffee[]) => void): Promise<Subscription> {
    const unsubscribe = this.#inventory.subscribe(listener);
    return new Subscription(unsubscribe);
  }

  async createDemoCoffee(notifier: CoffeeNotificationTarget): Promise<Coffee> {
    const coffee = await this.#inventory.createDemoCoffee(generateCoffee);
    try {
      await notifier.show(`New coffee "${coffee.name}" is ready to explore.`);
    } catch (error) {
      console.warn('Failed to deliver notification to client.', error);
    }
    return coffee;
  }

  async openSyncChannel(callback: (message: string) => void): Promise<SyncSession> {
    return this.#inventory.registerSync(callback);
  }
}

interface Env {
  COFFEE_INVENTORY: DurableObjectNamespace;
  STATIC_CONTENT?: Fetcher;
}

const API_PATH = '/rpc';

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname === API_PATH) {
      const id = env.COFFEE_INVENTORY.idFromName('primary');
      const stub = env.COFFEE_INVENTORY.get(id);
      return stub.fetch(request);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'content-type'
        }
      });
    }

    if (env.STATIC_CONTENT) {
      const response = await env.STATIC_CONTENT.fetch(request);
      const accept = request.headers.get('accept') ?? '';
      if (
        response.status === 404 &&
        request.method === 'GET' &&
        accept.includes('text/html')
      ) {
        const indexUrl = new URL('/index.html', url.origin);
        const indexRequest = new Request(indexUrl.toString(), {
          method: 'GET',
          headers: new Headers({
            accept: 'text/html'
          })
        });
        return env.STATIC_CONTENT.fetch(indexRequest);
      }
      return response;
    }

    return new Response('Not Found', { status: 404 });
  }
};

export class CoffeeInventoryDurable {
  #state: DurableObjectState;
  #inventory: AutomergeInventory | null = null;

  constructor(state: DurableObjectState) {
    this.#state = state;
  }

  async fetch(request: Request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'content-type'
        }
      });
    }

    const inventory = await this.#getInventory();
    const api = new InventoryApi(inventory);
    const response = await newWorkersRpcResponse(request, api);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }

  async alarm() {
    const inventory = await this.#getInventory();
    await inventory.mutate((doc) => {
      const coffees = doc.coffees ?? [];
      if (coffees.length === 0) return;
      const index = Math.floor(Math.random() * coffees.length);
      const target = coffees[index];
      const delta = Math.random() < 0.5 ? -1 : 1;
      target.stock = Math.max(0, (target.stock ?? 0) + delta);
    });
    await this.#scheduleNextAlarm();
  }

  async #getInventory(): Promise<AutomergeInventory> {
    if (this.#inventory) return this.#inventory;

    const stored = await this.#state.storage.get<ArrayBuffer>('doc');
    const persist = async (binary: Uint8Array) => {
      const view = binary.byteOffset === 0 && binary.byteLength === binary.buffer.byteLength
        ? binary.buffer
        : binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);
      await this.#state.storage.put('doc', view);
    };

    if (stored && stored.byteLength > 0) {
      try {
        this.#inventory = AutomergeInventory.fromBinary(new Uint8Array(stored), persist);
      } catch (error) {
        console.warn('Failed to load Automerge inventory from storage; recreating from seed.', error);
        await this.#state.storage.delete('doc');
        this.#inventory = AutomergeInventory.fromSeed(seedCoffees, persist);
      }
    } else {
      this.#inventory = AutomergeInventory.fromSeed(seedCoffees, persist);
    }

    await this.#scheduleNextAlarm();
    return this.#inventory;
  }

  async #scheduleNextAlarm() {
    await this.#state.storage.setAlarm(Date.now() + 8000);
  }
}
