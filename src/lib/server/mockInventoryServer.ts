import http from 'node:http';
import { WebSocketServer } from 'ws';
import { RpcTarget, newWebSocketRpcSession, nodeHttpBatchRpcResponse } from 'capnweb';
import { coffees as seedCoffees, type Coffee } from '$lib/data/fixtures';
import { cloneCoffees, generateCoffee } from './coffeeGenerator';

const API_PATH = '/rpc';
const PORT = Number.parseInt(process.env.VITE_CAPNWEB_PORT ?? process.env.CAPNWEB_PORT ?? '8787', 10);

type CoffeeListener = (items: Coffee[]) => void;

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

class MockCoffeeInventoryApi extends RpcTarget {
  #listeners = new Set<CoffeeListener>();
  #coffees: Coffee[];

  constructor(initial: Coffee[]) {
    super();
    this.#coffees = cloneCoffees(initial);
  }

  listCoffees(): Coffee[] {
    return cloneCoffees(this.#coffees);
  }

  getCoffee(id: string): Coffee | undefined {
    return this.#coffees.find((coffee) => coffee.id === id);
  }

  subscribeToCoffees(listener: CoffeeListener): Subscription {
    listener(cloneCoffees(this.#coffees));
    this.#listeners.add(listener);
    return new Subscription(() => this.#listeners.delete(listener));
  }

  createDemoCoffee(): Coffee {
    const created = generateCoffee();
    this.#coffees.unshift(created);
    this.#notify();
    return { ...created, tastingNotes: [...created.tastingNotes] };
  }

  bumpRandomStock(): void {
    if (this.#coffees.length === 0) return;
    const target = this.#coffees[Math.floor(Math.random() * this.#coffees.length)];
    const delta = Math.random() < 0.5 ? -1 : 1;
    target.stock = Math.max(0, target.stock + delta);
    this.#notify();
  }

  #notify(): void {
    const snapshot = cloneCoffees(this.#coffees);
    for (const listener of this.#listeners) {
      listener(snapshot);
    }
  }
}

let bootstrapPromise: Promise<void> | null = null;

function startServer(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = new Promise((resolve) => {
    const api = new MockCoffeeInventoryApi(seedCoffees);

    const httpServer = http.createServer(async (request, response) => {
      if (request.headers.upgrade?.toLowerCase() === 'websocket') {
        return;
      }

      if (request.url === API_PATH && request.method === 'POST') {
        try {
          await nodeHttpBatchRpcResponse(request, response, api, {
            headers: { 'Access-Control-Allow-Origin': '*' }
          });
        } catch (err) {
          response.writeHead(500, { 'content-type': 'text/plain' });
          response.end(String((err as Error)?.stack ?? err));
        }
        return;
      }

      if (request.method === 'OPTIONS' && request.url === API_PATH) {
        response.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'content-type'
        });
        response.end();
        return;
      }

      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('Not Found');
    });

    const wsServer = new WebSocketServer({ server: httpServer });
    wsServer.on('connection', (socket) => {
      newWebSocketRpcSession(socket as unknown as WebSocket, api);
    });

    httpServer.on('error', (error) => {
      console.error('Mock inventory server failed to start', error);
    });

    httpServer.listen(PORT, () => {
      console.info(`[mock-inventory] listening on port ${PORT}`);
      resolve();
    });

    setInterval(() => {
      api.bumpRandomStock();
    }, 8000).unref();
  });

  return bootstrapPromise;
}

let initialized = false;

export function ensureMockInventoryServer() {
  if (initialized) return;
  initialized = true;
  console.info('[mock-inventory] bootstrapping local Capn Web server');
  void startServer();
}
