import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { ensureMockInventoryServer } from '$lib/server/mockInventoryServer';

const workerWs = process.env.VITE_CAPNWEB_WS;
const USE_MOCK =
  dev &&
  process.env.CAPNWEB_USE_DURABLE !== 'true' &&
  (workerWs === undefined || workerWs.length === 0);

if (USE_MOCK) {
  ensureMockInventoryServer();
}

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
