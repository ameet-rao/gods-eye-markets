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
runs every 5 minutes (GitHub may delay scheduled runs) and also publishes `data.json`, which
open pages poll every minute, so viewers get new prices and events without reloading.
In the browser, the crisis feeds are also fetched directly every minute.

### Streaming prices

Add a free [Finnhub](https://finnhub.io/register) API key as the repository secret
`FINNHUB_KEY` (Settings → Secrets and variables → Actions), then re-run the Deploy workflow.
The page then streams live trades for the 50 most-signalled tickers. The key is embedded in
the public page, so use a free-tier key.

Or just open `gods-eye-markets.html` in a browser: it is the whole app in one file and runs
on the bundled snapshot (it still tries the public feeds directly).

## Data

| Layer | Source | Key needed |
|---|---|---|
| Earthquakes M5.8+ (aftershocks folded in) | USGS 4.5_week GeoJSON | no |
| Cyclones, floods, droughts, eruptions (Orange/Red) | GDACS API | no |
| Storm tracks, volcanoes | NASA EONET v3 | no |
| Prices (5 daily closes) | Yahoo Finance spark endpoint, server-side | no |
| Streaming trades (optional) | Finnhub WebSocket | free key |
| Airspace traffic per hotspot (hourly) | OpenSky Network REST, at build time | no |
| Ship congestion per port and strait (optional) | aisstream.io WebSocket, at build time | free key (`AISSTREAM_KEY` secret) |

The header pill shows whether data is live (fetched or published in the last 20 minutes). When a source can't be
reached, the app falls back to `src/snapshot.json`, which is baked into the build. Refresh it
with `npm run snapshot` (fetches everything from Node), then `npm run build`.

## How hotspots become tickers

- `src/hotspots.js` is the curated Financial-Geographic Index: 22 places, each with a risk
  score, a key metric, a summary and long/short ideas. Edit this file to add your own.
- `src/ideas.js` links live events to hotspots by distance (reach depends on type and
  strength, e.g. M7.5+ quake 900 km, cyclone 900 km, drought 1,600 km) and computes a heat
  score. A live event's ideas come from region rules (Japan, Taiwan, Chile, Gulf Coast...),
  then nearby hotspots, then a per-hazard playbook. Remote, low-alert events get no ideas.
- `src/signals.js` is the engine. Phase 1 scores each layer on its own for every hotspot:
  infrastructure (curated risk), environment (live events in range), aviation (OpenSky
  airborne traffic vs its running average; a drop means disruption) and maritime (AIS share of
  ships anchored or stopped vs its running average; a rise means congestion). Phase 2 fuses
  them per ticker across every place it is exposed to, with structural risk as the long-term
  thesis and live layers multiplying it, then checks the 5-day trend for confirmation.
- The list icon in the header shows the result: long-term buy (top third of net-long
  conviction, not up more than 12% in 5 days), hold (the other net longs) and sell (net short).

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
