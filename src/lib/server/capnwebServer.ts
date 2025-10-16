import http from 'node:http';
import { WebSocketServer } from 'ws';
import { RpcTarget, newWebSocketRpcSession, nodeHttpBatchRpcResponse } from 'capnweb';
import { coffees as seedCoffees, type Coffee } from '$lib/data/fixtures';

const API_PATH = '/rpc';
const PORT = Number.parseInt(process.env.CAPNWEB_PORT ?? '8787', 10);

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

class CoffeeInventoryApi extends RpcTarget {
  #listeners = new Set<CoffeeListener>();
  #coffees: Coffee[];

  constructor(initial: Coffee[]) {
    super();
    this.#coffees = initial.map((coffee) => ({ ...coffee, tastingNotes: [...coffee.tastingNotes] }));
  }

  listCoffees(): Coffee[] {
    return this.#snapshot();
  }

  getCoffee(id: string): Coffee | undefined {
    return this.#coffees.find((coffee) => coffee.id === id);
  }

  subscribeToCoffees(listener: CoffeeListener): Subscription {
    listener(this.#snapshot());
    this.#listeners.add(listener);
    return new Subscription(() => this.#listeners.delete(listener));
  }

  bumpRandomStock(): void {
    const target = this.#coffees[Math.floor(Math.random() * this.#coffees.length)];
    const delta = Math.random() < 0.5 ? -1 : 1;
    target.stock = Math.max(0, target.stock + delta);
    this.#notify();
  }

  #snapshot(): Coffee[] {
    return this.#coffees.map((coffee) => ({ ...coffee, tastingNotes: [...coffee.tastingNotes] }));
  }

  #notify(): void {
    const snapshot = this.#snapshot();
    for (const listener of this.#listeners) {
      listener(snapshot);
    }
  }
}

let bootstrapPromise: Promise<void> | null = null;

function startServer(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = new Promise((resolve) => {
    const api = new CoffeeInventoryApi(seedCoffees);
    const httpServer = http.createServer(async (request, response) => {
      if (request.headers.upgrade?.toLowerCase() === 'websocket') {
        // WebSocket upgrade handled by ws.
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
      // The `ws` package's socket implements the standard WebSocket interface at runtime.
      newWebSocketRpcSession(socket as unknown as WebSocket, api);
    });

    httpServer.listen(PORT, () => {
      resolve();
    });

    setInterval(() => {
      api.bumpRandomStock();
    }, 8000).unref();
  });

  return bootstrapPromise;
}

let initialized = false;

export function ensureCapnwebServer() {
  if (initialized) return;
  initialized = true;
  void startServer();
}
