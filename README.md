# God's Eye Markets

A dark, simplified 3D globe that maps supply-chain choke points, critical infrastructure,
commodity hubs and live crises to the stocks they move. Click a pulsing hotspot to get a
dossier: why the place matters, which live threats are in range, and long/short ticker
ideas with a one-line thesis, last price, 1-day move and a 5-day sparkline. Each idea links
to a Yahoo Finance quote and the Google Finance page for the ticker. Nothing is executed in-app.

**Research tool, not financial advice.**

## Run it

Requires Node 20.19+ (or 22+).

```bash
npm install
npm run dev          # http://localhost:4173, live feeds + live prices
```

`npm run dev` and `npm run preview` include a small same-origin `/api` proxy, so the browser
gets live Yahoo prices (Yahoo blocks direct browser calls) and live feeds regardless of CORS.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which refreshes the data snapshot,
builds, and publishes `dist/` to the `gh-pages` branch for GitHub Pages. The same workflow
runs every 30 minutes, so the hosted site's prices and events stay current without a server.
On the hosted site, USGS and NASA data also load live in the browser.

Or just open `gods-eye-markets.html` in a browser: it is the whole app in one file and runs
on the bundled snapshot (it still tries the public feeds directly).

## Data

| Layer | Source | Key needed |
|---|---|---|
| Earthquakes M5.8+ (aftershocks folded in) | USGS 4.5_week GeoJSON | no |
| Cyclones, floods, droughts, eruptions (Orange/Red) | GDACS API | no |
| Storm tracks, volcanoes | NASA EONET v3 | no |
| Prices (5 daily closes) | Yahoo Finance spark endpoint, server-side | no |

The header chips show each source as **live** or **snapshot**. When a source can't be
reached, the app falls back to `src/snapshot.json`, which is baked into the build. Refresh it
with `npm run snapshot` (fetches everything from Node), then `npm run build`.

## How hotspots become tickers

- `src/hotspots.js` is the curated Financial-Geographic Index: 22 places, each with a risk
  score, a key metric, a summary and long/short ideas. Edit this file to add your own.
- `src/ideas.js` links live events to hotspots by distance (reach depends on type and
  strength, e.g. M7.5+ quake 900 km, cyclone 900 km, drought 1,600 km) and computes a heat
  score. A live event's ideas come from region rules (Japan, Taiwan, Chile, Gulf Coast...),
  then nearby hotspots, then a per-hazard playbook. Remote, low-alert events get no ideas.
- The bottom tape ranks tickers by how many active signals point at them.

## Scripts

- `npm run build` writes `dist/index.html` (single self-contained file).
- `npm test` builds nothing; run it after a build. It serves `dist/`, drives headless Chrome
  through hotspot, event and ticker panels on desktop and mobile, and saves screenshots to
  `screenshots/`. Set `CHROME_PATH` if Chrome isn't found.
- `node scripts/artifact.mjs out.html` strips the document wrapper for hosts that add their own.

## Files

```
index.html            shell
src/main.js           globe, layers, labels, panels, live refresh
src/style.css         console styling, mobile bottom sheets
src/hotspots.js       curated hotspots, event playbooks, region rules
src/ideas.js          event-to-hotspot linking, heat, leaderboard
src/feeds.js          USGS/GDACS/EONET fetch + normalization
src/lanes.js          simplified shipping lanes
src/snapshot.json     offline fallback (events + prices)
scripts/              snapshot refresher, Yahoo helper, smoke test
```
