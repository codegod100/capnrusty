import { RpcTarget, newWorkersRpcResponse } from 'capnweb';
import type { DurableObjectNamespace, DurableObjectState, DurableObjectStorage } from '@cloudflare/workers-types';
import { coffees as seedCoffees, type Coffee } from '../lib/data/fixtures';
import { cloneCoffees, generateCoffee } from '../lib/server/coffeeGenerator';

type CoffeeListener = (items: Coffee[]) => void;

class CoffeeInventoryTarget extends RpcTarget {
  #listeners = new Set<CoffeeListener>();
  #coffees: Coffee[];
  #storage: DurableObjectStorage;

  constructor(initial: Coffee[], storage: DurableObjectStorage) {
    super();
    this.#coffees = cloneCoffees(initial);
    this.#storage = storage;
  }

  async listCoffees(): Promise<Coffee[]> {
    return this.#snapshot();
  }

  async getCoffee(id: string): Promise<Coffee | undefined> {
    return this.#coffees.find((coffee) => coffee.id === id);
  }

  async subscribeToCoffees(listener: CoffeeListener): Promise<Subscription> {
    listener(this.#snapshot());
    this.#listeners.add(listener);
    return new Subscription(() => this.#listeners.delete(listener));
  }

  async createDemoCoffee(): Promise<Coffee> {
    const created = generateCoffee();
    this.#coffees.unshift(created);
    await this.#persist();
    this.#notify();
    return { ...created, tastingNotes: [...created.tastingNotes] };
  }

  async bumpRandomStock(): Promise<void> {
    if (this.#coffees.length === 0) return;
    const target = this.#coffees[Math.floor(Math.random() * this.#coffees.length)];
    const delta = Math.random() < 0.5 ? -1 : 1;
    target.stock = Math.max(0, target.stock + delta);
    await this.#persist();
    this.#notify();
  }

  #snapshot(): Coffee[] {
    return cloneCoffees(this.#coffees);
  }

  async #persist(): Promise<void> {
    await this.#storage.put('coffees', this.#coffees);
  }

  #notify(): void {
    const snapshot = this.#snapshot();
    for (const listener of this.#listeners) {
      listener(snapshot);
    }
  }
}

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

interface Env {
  COFFEE_INVENTORY: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname === '/rpc') {
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

    return new Response('Not Found', { status: 404 });
  }
};

export class CoffeeInventoryDurable {
  #state: DurableObjectState;
  #api: CoffeeInventoryTarget | null = null;

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

    const api = await this.#getApi();
    const response = await newWorkersRpcResponse(request, api);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }

  async alarm() {
    const api = await this.#getApi();
    await api.bumpRandomStock();
    await this.#scheduleNextAlarm();
  }

  async #getApi(): Promise<CoffeeInventoryTarget> {
    if (!this.#api) {
      const stored = await this.#state.storage.get<Coffee[]>('coffees');
      const initial = stored ? cloneCoffees(stored) : cloneCoffees(seedCoffees);

      if (!stored) {
        await this.#state.storage.put('coffees', initial);
      }

      this.#api = new CoffeeInventoryTarget(initial, this.#state.storage);
      await this.#scheduleNextAlarm();
    }

    return this.#api;
  }

  async #scheduleNextAlarm() {
    // Nudge every 8 seconds to simulate stock changes.
    await this.#state.storage.setAlarm(Date.now() + 8000);
  }
}
