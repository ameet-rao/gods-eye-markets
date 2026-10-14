import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { FEEDS } from './src/feeds.js';
import { fetchQuotes, fetchText } from './scripts/yahoo.mjs';

// Same-origin /api routes for `npm run dev` and `npm run preview`, so the browser gets live
// prices (Yahoo has no CORS) and feeds without depending on each provider's CORS headers.
// Publishes the snapshot next to the page as data.json so open pages can poll for newer data.
function publishData() {
  return {
    name: 'publish-data',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'data.json', source: readFileSync('src/snapshot.json', 'utf8') });
    },
  };
}

function liveApi() {
  const cache = new Map();
  const cached = async (key, ttl, fn) => {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.t < ttl) return hit.v;
    const v = await fn();
    cache.set(key, { t: Date.now(), v });
    return v;
  };
  const handler = async (req, res, next) => {
    const url = new URL(req.url, 'http://local');
    const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(body); };
    try {
      if (url.pathname.endsWith('/api/quotes')) {
        const syms = (url.searchParams.get('symbols') || '').split(',').filter((s) => /^[A-Z.\-^=]{1,10}$/.test(s)).slice(0, 200);
        const data = await cached('q:' + syms.join(','), 60e3, () => fetchQuotes(syms));
        return send(200, JSON.stringify(data));
      }
      if (url.pathname.endsWith('/api/feed')) {
        const f = FEEDS[url.searchParams.get('src')];
        if (!f) return send(400, '{"error":"unknown feed"}');
        const target = typeof f.url === 'function' ? f.url() : f.url;
        const body = await cached('f:' + target, 5 * 60e3, () => fetchText(target));
        return send(200, body);
      }
    } catch (e) {
      return send(502, JSON.stringify({ error: e.message }));
    }
    next();
  };
  return {
    name: 'live-api',
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}

export default defineConfig({
  base: './',
  plugins: [liveApi(), publishData(), viteSingleFile()],
  server: { port: 4173 },
  preview: { port: 4173 },
  build: { chunkSizeWarningLimit: 3000 },
});
