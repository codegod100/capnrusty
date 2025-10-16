import type { Handle } from '@sveltejs/kit';
import { ensureCapnwebServer } from '$lib/server/capnwebServer';

// Automatically boot the Cap'n Web RPC server when the SvelteKit server starts.
ensureCapnwebServer();

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
