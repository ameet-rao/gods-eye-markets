// Refreshes src/snapshot.json (the offline fallback baked into the build) with current prices and events.
//   npm run snapshot               fetch everything live
//   node scripts/snapshot.mjs --raw <dir>   rebuild events from saved usgs/gdacs/eonet JSON, keep prices
import { readFile, writeFile } from 'node:fs/promises';
import { FEEDS, normalizeUsgs, normalizeGdacs, normalizeEonet, mergeEvents } from '../src/feeds.js';
import { allSymbols } from '../src/ideas.js';
import { fetchQuotes, fetchText } from './yahoo.mjs';

const rawDir = process.argv.includes('--raw') ? process.argv[process.argv.indexOf('--raw') + 1] : null;
const out = new URL('../src/snapshot.json', import.meta.url);
let prev = {};
try { prev = JSON.parse(await readFile(out, 'utf8')); } catch {}

async function feed(key) {
  if (rawDir) return JSON.parse(await readFile(`${rawDir}/${key}.json`, 'utf8'));
  const f = FEEDS[key];
  return JSON.parse(await fetchText(typeof f.url === 'function' ? f.url() : f.url));
}

const parts = {};
for (const [key, norm] of [['usgs', normalizeUsgs], ['gdacs', normalizeGdacs], ['eonet', normalizeEonet]]) {
  try { parts[key] = norm(await feed(key)); console.log(`${key}: ${parts[key].length} events`); }
  catch (e) { console.warn(`${key}: failed (${e.message}), keeping previous`); }
}
const takenAt = Date.now();
const events = Object.keys(parts).length === 3 ? mergeEvents(parts, takenAt) : prev.events || [];

let quotes = prev.quotes;
if (!rawDir) {
  try { quotes = await fetchQuotes(allSymbols()); console.log(`quotes: ${Object.keys(quotes.q).length}`); }
  catch (e) { console.warn(`quotes: failed (${e.message}), keeping previous`); }
}

await writeFile(out, JSON.stringify({ takenAt: new Date(takenAt).toISOString(), events, quotes }));
console.log(`wrote ${out.pathname}: ${events.length} events, ${Object.keys(quotes?.q || {}).length} quotes`);
