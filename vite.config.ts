import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const API_PATH = '/rpc';
const CAPNWEB_PORT = Number.parseInt(process.env.CAPNWEB_PORT ?? '8787', 10);
const capnwebProxyTarget = `http://127.0.0.1:${CAPNWEB_PORT}`;

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    target: 'esnext'
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  esbuild: {
    target: 'esnext'
  },
  server: {
    proxy: {
      [API_PATH]: {
        target: capnwebProxyTarget,
        changeOrigin: false,
        ws: true
      }
    }
  },
  preview: {
    proxy: {
      [API_PATH]: {
        target: capnwebProxyTarget,
        changeOrigin: false,
        ws: true
      }
    }
  }
});
