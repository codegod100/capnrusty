import http from 'node:http';
import { WebSocketServer } from 'ws';
import { RpcTarget, newWebSocketRpcSession, nodeHttpBatchRpcResponse } from 'capnweb';
import { coffees as seedCoffees, type Coffee } from '$lib/data/fixtures';
import { generateCoffee } from './coffeeGenerator';
import { AutomergeInventory, SyncSession } from './automergeInventory';

const API_PATH = '/rpc';
const PORT = Number.parseInt(process.env.VITE_CAPNWEB_PORT ?? process.env.CAPNWEB_PORT ?? '8787', 10);

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
  #inventory: AutomergeInventory;

  constructor(seed: Coffee[]) {
    super();
    this.#inventory = AutomergeInventory.fromSeed(seed);
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

  async createDemoCoffee(): Promise<Coffee> {
    return this.#inventory.createDemoCoffee(generateCoffee);
  }

  async bumpRandomStock(): Promise<void> {
    await this.#inventory.mutate((doc) => {
      const coffees = doc.coffees ?? [];
      if (coffees.length === 0) return;
      const index = Math.floor(Math.random() * coffees.length);
      const target = coffees[index];
      const delta = Math.random() < 0.5 ? -1 : 1;
      target.stock = Math.max(0, (target.stock ?? 0) + delta);
    });
  }

  async openSyncChannel(callback: (message: string) => void): Promise<SyncSession> {
    return this.#inventory.registerSync(callback);
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
      void api.bumpRandomStock();
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
