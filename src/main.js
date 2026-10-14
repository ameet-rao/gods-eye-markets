import { googleFinanceUrl } from './exchanges.js';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { feature, mesh } from 'topojson-client';
import landTopo from 'world-atlas/land-110m.json';
import countriesTopo from 'world-atlas/countries-110m.json';
import './style.css';
import { HOTSPOTS, CATEGORIES, EVENT_THEMES } from './hotspots.js';
import { loadFeed, loadQuotes, mergeEvents, FEEDS } from './feeds.js';
import { linkEvents, heat, ideasForEvent, leaderboard, allSymbols } from './ideas.js';
import { lanesGeoJSON } from './lanes.js';
import snapshot from './snapshot.json';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

// ---------- state ----------
const state = {
  events: snapshot.events.map((e) => ({ ...e })),
  quotes: snapshot.quotes,
  feedStatus: { usgs: 'loading', gdacs: 'loading', eonet: 'loading', quotes: 'loading' },
  filter: 'all',
  query: '',
  selected: null, // { kind: 'hotspot'|'event'|'ticker', id }
  links: new Map(),
  eventsById: new Map(),
};

function relink() {
  state.links = linkEvents(state.events);
  state.eventsById = new Map(state.events.map((e) => [e.id, e]));
}
relink();

// ---------- quotes ----------
function quote(t) {
  const q = state.quotes?.q?.[t];
  if (!q) return null;
  const [name, closes] = q;
  const last = closes[closes.length - 1];
  const prev = closes[closes.length - 2] ?? last;
  return { name, closes, last, chg: ((last - prev) / prev) * 100, chg5: ((last - closes[0]) / closes[0]) * 100 };
}
const fmtPrice = (p) => (p >= 1000 ? p.toLocaleString('en-US', { maximumFractionDigits: 0 }) : p.toFixed(2));
const fmtPct = (x) => `${x >= 0 ? '+' : ''}${x.toFixed(2)}%`;

function spark(closes, w = 64, h = 22) {
  const min = Math.min(...closes), max = Math.max(...closes);
  const span = max - min || 1;
  const pts = closes.map((c, i) => [(i / (closes.length - 1)) * (w - 4) + 2, h - 3 - ((c - min) / span) * (h - 6)]);
  const up = closes[closes.length - 1] >= closes[0];
  const line = pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
  const area = `2,${h} ${line} ${w - 2},${h}`;
  const [ex, ey] = pts[pts.length - 1];
  return `<svg class="spark ${up ? 'up' : 'down'}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <polygon points="${area}" class="spark-area"/><polyline points="${line}" class="spark-line"/>
    <circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="2" class="spark-dot"/></svg>`;
}

// ---------- theme ----------
const MAP_THEME = {
  dark: { ocean: '#1b4f7d', grat: '#2f689a', land: '#3f7a3b', coast: '#2b5a2a', borders: '#6a9a5e', ice: '#dfe8ee', lanes: '#e6f2ff', sky: '#05080d', horizon: '#3b7fc4', stroke: '#0b1a2a', lvl1: '#ffd166' },
  light: { ocean: '#5f9fd8', grat: '#82b6e2', land: '#78ad62', coast: '#4f8540', borders: '#a4cc92', ice: '#f5f8fb', lanes: '#ffffff', sky: '#eef2f6', horizon: '#a9cdf0', stroke: '#ffffff', lvl1: '#f2b705' },
};
let themeOverride = (() => { try { return localStorage.getItem('theme'); } catch { return null; } })();
function storedTheme() { return themeOverride; }
function currentTheme() {
  return themeOverride || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
}
function applyTheme() {
  const t = currentTheme();
  const explicit = storedTheme();
  if (explicit) document.documentElement.dataset.theme = explicit; else delete document.documentElement.dataset.theme;
  const btn = document.getElementById('themeBtn');
  if (btn) { btn.innerHTML = `${t === 'dark' ? 'Light' : 'Dark'}<span class="full">&nbsp;mode</span>`; }
  if (!window.__map || !window.__map.isStyleLoaded()) return;
  const m = window.__map, c = MAP_THEME[t];
  m.setPaintProperty('ocean', 'background-color', c.ocean);
  m.setPaintProperty('graticule', 'line-color', c.grat);
  m.setPaintProperty('land', 'fill-color', c.land);
  m.setPaintProperty('ice', 'fill-color', c.ice);
  m.setPaintProperty('coast', 'line-color', c.coast);
  m.setPaintProperty('borders', 'line-color', c.borders);
  m.setPaintProperty('lanes', 'line-color', c.lanes);
  m.setPaintProperty('hot-core', 'circle-stroke-color', ['case', ['>', ['get', 'live'], 0], t === 'dark' ? '#ffffff' : '#111111', c.stroke]);
  m.setPaintProperty('event-dot', 'circle-stroke-color', c.stroke);
  m.setPaintProperty('selected', 'circle-stroke-color', t === 'dark' ? '#ffffff' : '#111111');
  m.setSky({ 'sky-color': c.sky, 'horizon-color': c.horizon, 'fog-color': c.sky, 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.9, 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 0.6, 7, 0] });
  LEVEL_COLOR[1] = c.lvl1;
  refreshMapData();
}
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);

// ---------- map ----------
const land = feature(landTopo, landTopo.objects.land);
// Ice sheets are drawn over the green land so the poles read like a real globe.
const ice = { type: 'FeatureCollection', features: feature(countriesTopo, countriesTopo.objects.countries).features.filter((f) => ['Antarctica', 'Greenland'].includes(f.properties.name)) };
const borders = mesh(countriesTopo, countriesTopo.objects.countries, (a, b) => a !== b);
const graticule = {
  type: 'FeatureCollection',
  features: [
    ...Array.from({ length: 12 }, (_, i) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: Array.from({ length: 37 }, (_, j) => [-180 + i * 30, -90 + j * 5]) } })),
    ...Array.from({ length: 5 }, (_, i) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: Array.from({ length: 73 }, (_, j) => [-180 + j * 5, -60 + i * 30]) } })),
  ],
};

function hotspotsGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: HOTSPOTS.map((h) => {
      const live = state.links.get(h.id)?.length || 0;
      return {
        type: 'Feature', id: HOTSPOTS.indexOf(h),
        properties: { id: h.id, cat: h.cat, color: CATEGORIES[h.cat].color, heat: heat(h, state.links, state.eventsById), live },
        geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
      };
    }),
  };
}
const LEVEL_COLOR = { 1: '#e9c46a', 2: '#f57c2b', 3: '#e5383b' };
function eventsGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: state.events.map((e, i) => ({
      type: 'Feature', id: i,
      properties: { id: e.id, type: e.type, level: e.level, color: LEVEL_COLOR[e.level], mag: e.mag || 0, area: e.type === 'DR' ? 1 : 0 },
      geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
    })),
  };
}
function tracksGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: state.events.filter((e) => e.track).map((e) => ({
      type: 'Feature', properties: { id: e.id, color: LEVEL_COLOR[e.level] },
      geometry: { type: 'MultiLineString', coordinates: splitAntimeridian(e.track) },
    })),
  };
}

// Break a track wherever it jumps across the dateline, so it doesn't draw a segment around the globe.
function splitAntimeridian(pts) {
  const parts = [[pts[0]]];
  for (let i = 1; i < pts.length; i++) {
    if (Math.abs(pts[i][0] - pts[i - 1][0]) > 180) parts.push([]);
    parts[parts.length - 1].push(pts[i]);
  }
  return parts.filter((p) => p.length > 1);
}

// Keep the globe centred in the open area between the docked rail and panel.
function viewPadding() {
  if (isMobile()) return { top: 50, bottom: state.selected ? window.innerHeight * 0.5 : 60, left: 0, right: 0 };
  return { top: 60, bottom: 60, left: 352, right: state.selected ? 430 : 0 };
}
function fitZoom() {
  const pad = viewPadding();
  const w = window.innerWidth - (isMobile() ? 0 : 352);
  const h = window.innerHeight - pad.top - pad.bottom;
  // At zoom z the globe is ~ 512 * 2^z / PI px across.
  return Math.log2((Math.min(w, h) * 0.86 * Math.PI) / 512);
}

const map = new maplibregl.Map({
  container: 'map',
  attributionControl: false,
  center: [40, 22],
  zoom: fitZoom(),
  minZoom: 0.6,
  maxZoom: 6,
  renderWorldCopies: false,
  style: {
    version: 8,
    projection: { type: 'globe' },
    sky: {
      'sky-color': '#05080d',
      'horizon-color': '#0f3a4f',
      'fog-color': '#05080d',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.7,
      'fog-ground-blend': 0.9,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 0.6, 7, 0],
    },
    sources: {
      land: { type: 'geojson', data: land },
      ice: { type: 'geojson', data: ice },
      borders: { type: 'geojson', data: borders },
      graticule: { type: 'geojson', data: graticule },
      lanes: { type: 'geojson', data: lanesGeoJSON() },
      hotspots: { type: 'geojson', data: hotspotsGeoJSON() },
      events: { type: 'geojson', data: eventsGeoJSON() },
      tracks: { type: 'geojson', data: tracksGeoJSON() },
    },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': '#08111b' } },
      { id: 'graticule', type: 'line', source: 'graticule', paint: { 'line-color': '#16324a', 'line-width': 0.6, 'line-opacity': 0.35 } },
      { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#121c27', 'fill-antialias': true } },
      { id: 'ice', type: 'fill', source: 'ice', paint: { 'fill-color': '#dfe8ee' } },
      { id: 'coast', type: 'line', source: 'land', paint: { 'line-color': '#2b4b62', 'line-width': 0.8 } },
      { id: 'borders', type: 'line', source: 'borders', paint: { 'line-color': '#24394b', 'line-width': 0.5 } },
      { id: 'lanes', type: 'line', source: 'lanes', paint: {
        'line-color': '#3fd0ff', 'line-opacity': ['case', ['get', 'main'], 0.55, 0.3],
        'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.8, 4, 1.6], 'line-dasharray': [2, 2] } },
      { id: 'tracks', type: 'line', source: 'tracks', layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 1.4, 'line-opacity': 0.7 } },
      // drought zones read as broad haze rather than a point
      { id: 'event-area', type: 'circle', source: 'events', filter: ['==', ['get', 'area'], 1], paint: {
        'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 0, 18, 6, 1100], 'circle-color': ['get', 'color'],
        'circle-opacity': 0.07, 'circle-blur': 0.6, 'circle-pitch-alignment': 'map' } },
      { id: 'event-pulse', type: 'circle', source: 'events', paint: { 'circle-radius': 8, 'circle-color': 'transparent', 'circle-stroke-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-stroke-opacity': 0.6 } },
      { id: 'event-dot', type: 'circle', source: 'events', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, ['+', 2.5, ['*', ['get', 'level'], 1.2]], 5, ['+', 5, ['*', ['get', 'level'], 2]]],
        'circle-color': ['get', 'color'], 'circle-stroke-color': '#05080d', 'circle-stroke-width': 1 } },
      { id: 'hot-pulse-a', type: 'circle', source: 'hotspots', paint: { 'circle-radius': 10, 'circle-color': 'transparent', 'circle-stroke-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-stroke-opacity': 0.7 } },
      { id: 'hot-pulse-b', type: 'circle', source: 'hotspots', paint: { 'circle-radius': 10, 'circle-color': 'transparent', 'circle-stroke-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-stroke-opacity': 0.7 } },
      { id: 'hot-glow', type: 'circle', source: 'hotspots', paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'heat'], 2, 9, 12, 20], 'circle-color': ['get', 'color'], 'circle-opacity': 0.18, 'circle-blur': 0.8 } },
      { id: 'hot-core', type: 'circle', source: 'hotspots', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 4, 5, 7], 'circle-color': ['get', 'color'],
        'circle-stroke-color': ['case', ['>', ['get', 'live'], 0], '#ffffff', '#05080d'], 'circle-stroke-width': ['case', ['>', ['get', 'live'], 0], 1.6, 1] } },
      { id: 'selected', type: 'circle', source: 'hotspots', filter: ['==', ['get', 'id'], ''], paint: {
        'circle-radius': 16, 'circle-color': 'transparent', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.2 } },
    ],
  },
});
window.__map = map;

// ---------- ticker labels on the globe ----------
const labelMarkers = [];
function buildLabels() {
  labelMarkers.forEach((m) => m.marker.remove());
  labelMarkers.length = 0;
  for (const h of HOTSPOTS) {
    const el = document.createElement('button');
    el.className = 'glabel';
    el.dataset.cat = h.cat;
    el.setAttribute('aria-label', `${h.name}: ${h.ideas.map((i) => i.t).join(', ')}`);
    const top = h.ideas.slice(0, 2).map((i) => {
      const q = quote(i.t);
      return `<span class="gt ${i.side}">${esc(i.t)}<i>${i.side === 'long' ? '▲' : '▼'}</i>${q ? `<em class="${q.chg >= 0 ? 'pos' : 'neg'}">${fmtPct(q.chg)}</em>` : ''}</span>`;
    }).join('');
    const live = state.links.get(h.id)?.length;
    el.innerHTML = `<span class="gname">${live ? '<b class="alert" title="Live event nearby"></b>' : ''}${esc(h.name)}</span><span class="gtk">${top}</span>`;
    el.addEventListener('click', (ev) => { ev.stopPropagation(); select({ kind: 'hotspot', id: h.id }); });
    const marker = new maplibregl.Marker({ element: el, anchor: 'left', offset: [10, 0] }).setLngLat([h.lon, h.lat]).addTo(map);
    labelMarkers.push({ marker, el, h });
  }
  updateLabels();
}

// Hide labels on the far side of the globe, and declutter when zoomed out.
function updateLabels() {
  const c = map.getCenter();
  const toV = (lon, lat) => {
    const a = (lon * Math.PI) / 180, b = (lat * Math.PI) / 180;
    return [Math.cos(b) * Math.cos(a), Math.cos(b) * Math.sin(a), Math.sin(b)];
  };
  const cv = toV(c.lng, c.lat);
  const shown = [];
  const sorted = [...labelMarkers].sort((a, b) => heat(b.h, state.links, state.eventsById) - heat(a.h, state.links, state.eventsById));
  for (const lm of sorted) {
    const v = toV(lm.h.lon, lm.h.lat);
    const dot = v[0] * cv[0] + v[1] * cv[1] + v[2] * cv[2];
    let visible = dot > 0.35 && passesFilter(lm.h);
    if (visible) {
      const p = map.project([lm.h.lon, lm.h.lat]);
      // simple collision check against labels already placed
      lm.w = lm.w || lm.el.offsetWidth || 160;
      lm.hgt = lm.hgt || lm.el.offsetHeight || 34;
      const box = { x: p.x + 10, y: p.y - lm.hgt / 2, w: lm.w, h: lm.hgt };
      if (shown.some((s) => box.x < s.x + s.w && box.x + box.w > s.x && box.y < s.y + s.h && box.y + box.h > s.y)) visible = state.selected?.id === lm.h.id;
      if (visible) shown.push(box);
    }
    lm.el.classList.toggle('hidden', !visible);
    lm.el.classList.toggle('sel', state.selected?.id === lm.h.id);
  }
}

// ---------- pulse + auto-rotate ----------
let userBusy = false;
let lastInteract = 0;
let flying = false;
function frame(t) {
  if (map.loaded() && map.getLayer('hot-pulse-a')) {
    const z = map.getZoom();
    const base = 6 + z * 1.5;
    for (const [id, off] of [['hot-pulse-a', 0], ['hot-pulse-b', 0.5]]) {
      const p = ((t / 2400) + off) % 1;
      map.setPaintProperty(id, 'circle-radius', base + p * 18);
      map.setPaintProperty(id, 'circle-stroke-opacity', 0.75 * (1 - p));
    }
    const pe = (t / 1600) % 1;
    map.setPaintProperty('event-pulse', 'circle-radius', base - 2 + pe * 14);
    map.setPaintProperty('event-pulse', 'circle-stroke-opacity', 0.8 * (1 - pe));
    const idle = !userBusy && !flying && !state.selected && Date.now() - lastInteract > 12000;
    if (idle && !reduceMotion) {
      const c = map.getCenter();
      map.setCenter([c.lng + 0.035, c.lat]);
    }
  }
  if (!reduceMotion) requestAnimationFrame(frame);
}
['mousedown', 'touchstart', 'wheel'].forEach((ev) => map.getCanvasContainer().addEventListener(ev, () => { userBusy = true; lastInteract = Date.now(); }, { passive: true }));
['mouseup', 'touchend'].forEach((ev) => window.addEventListener(ev, () => { userBusy = false; lastInteract = Date.now(); }));
map.on('wheel', () => { lastInteract = Date.now(); });
map.on('move', updateLabels);
map.on('movestart', (e) => { if (e.originalEvent) lastInteract = Date.now(); });

// ---------- interactions ----------
const tooltip = document.createElement('div');
tooltip.className = 'tip';
tooltip.hidden = true;
document.body.appendChild(tooltip);

map.on('load', () => {
  map.setPadding(viewPadding());
  applyTheme();
  buildLabels();
  for (const layer of ['hot-core', 'hot-glow', 'event-dot']) {
    map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; tooltip.hidden = true; });
  }
  map.on('mousemove', 'event-dot', (e) => {
    const ev = state.eventsById.get(e.features[0].properties.id);
    if (!ev) return;
    tooltip.innerHTML = `<b>${esc(ev.title)}</b><span>${esc(ev.place || ev.source)}</span>`;
    tooltip.style.left = e.originalEvent.clientX + 14 + 'px';
    tooltip.style.top = e.originalEvent.clientY + 14 + 'px';
    tooltip.hidden = false;
  });
  map.on('click', (e) => {
    const feats = map.queryRenderedFeatures(e.point, { layers: ['hot-core', 'hot-glow', 'event-dot'] });
    const ev = feats.find((f) => f.layer.id === 'event-dot');
    const hs = feats.find((f) => f.layer.id !== 'event-dot');
    if (hs) select({ kind: 'hotspot', id: hs.properties.id });
    else if (ev) select({ kind: 'event', id: ev.properties.id });
    else if (state.selected) select(null);
  });
  requestAnimationFrame(frame);
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash && HOTSPOTS.some((h) => h.id === hash)) select({ kind: 'hotspot', id: hash });
  document.body.classList.add('ready');
});

function refreshMapData() {
  if (!map.isStyleLoaded()) return;
  map.getSource('hotspots').setData(hotspotsGeoJSON());
  map.getSource('events').setData(eventsGeoJSON());
  map.getSource('tracks').setData(tracksGeoJSON());
  buildLabels();
}

function select(sel) {
  state.selected = sel;
  if (map.getLayer('selected')) map.setFilter('selected', ['==', ['get', 'id'], sel?.kind === 'hotspot' ? sel.id : '']);
  renderPanel();
  renderList();
  updateLabels();
  try { history.replaceState(null, '', sel?.kind === 'hotspot' ? '#' + sel.id : location.pathname + location.search); } catch {}
  if (!sel) { map.easeTo({ padding: viewPadding(), duration: reduceMotion ? 0 : 600 }); return; }
  let target;
  if (sel.kind === 'hotspot') { const h = HOTSPOTS.find((x) => x.id === sel.id); target = [h.lon, h.lat]; }
  if (sel.kind === 'event') { const e = state.eventsById.get(sel.id); target = [e.lon, e.lat]; }
  if (target) {
    flying = true;
    map.flyTo({ center: target, zoom: Math.max(map.getZoom(), fitZoom() + 0.9), padding: viewPadding(), duration: reduceMotion ? 0 : 1600, essential: true });
    map.once('moveend', () => { flying = false; });
  }
  if (isMobile()) $('#rail').classList.remove('open');
}

// ---------- panel ----------
function ideaRow(i) {
  const q = quote(i.t);
  const via = i.via ? `<span class="via">via ${esc(i.via)}</span>` : '';
  return `<li class="idea">
    <div class="idea-top">
      <button class="tk" data-ticker="${esc(i.t)}">${esc(i.t)}</button>
      <span class="side ${i.side}">${i.side === 'long' ? 'LONG' : 'SHORT'}</span>
      <span class="iname">${esc(q?.name || '')}</span>
      ${q ? `<span class="px">${fmtPrice(q.last)}</span><span class="chg ${q.chg >= 0 ? 'pos' : 'neg'}">${fmtPct(q.chg)}</span>${spark(q.closes)}` : '<span class="px muted">n/a</span>'}
    </div>
    <p class="why">${esc(i.why)} ${via}</p>
    <div class="acts">
      <a href="https://finance.yahoo.com/quote/${encodeURIComponent(i.t)}" target="_blank" rel="noopener">Quote ↗</a>
      <a class="trade" href="${googleFinanceUrl(i.t)}" target="_blank" rel="noopener">Trade ${esc(i.t)} ↗</a>
    </div>
  </li>`;
}

const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 60) return `${Math.max(m, 1)} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
};
const km = (d) => `${Math.round(d).toLocaleString()} km`;
const typeLabel = (t) => EVENT_THEMES[t]?.label || t;

function priceFoot() {
  const live = state.feedStatus.quotes === 'live';
  return `<p class="foot">${live ? 'Prices: live from Yahoo Finance' : `Prices: close of ${esc(state.quotes.asOf)}, ${esc(state.quotes.source)}`}. Change is vs prior close; sparkline is the last 5 sessions.</p>`;
}

function renderPanel() {
  const p = $('#panel');
  const sel = state.selected;
  if (!sel) { p.hidden = true; document.body.classList.remove('panel-open'); return; }
  let html = '';
  if (sel.kind === 'hotspot') {
    const h = HOTSPOTS.find((x) => x.id === sel.id);
    const cat = CATEGORIES[h.cat];
    const near = (state.links.get(h.id) || []).map((l) => ({ e: state.eventsById.get(l.id), d: l.d })).filter((x) => x.e).sort((a, b) => b.e.level - a.e.level || a.d - b.d);
    html = `
      <div class="p-head" style="--cat:${cat.color}">
        <div class="eyebrow"><span class="dot"></span>${esc(cat.short)} · risk ${h.risk}/5</div>
        <h2>${esc(h.name)}</h2>
        <div class="metric">${esc(h.metric)}</div>
      </div>
      <p class="summary">${esc(h.summary)}</p>
      ${near.length ? `<div class="threats"><h3>Nearby live events</h3><ul>${near.map(({ e, d }) => `<li><button class="ev lvl${e.level}" data-event="${esc(e.id)}"><span class="ldot"></span><b>${esc(e.title)}</b><span>${esc(typeLabel(e.type))} · ${km(d)} away · ${ago(e.time)}</span></button></li>`).join('')}</ul></div>` : `<p class="calm">No live events nearby. These are the standing ideas if this spot is disrupted.</p>`}
      <h3 class="ideas-h">Ideas</h3>
      <ul class="ideas">${h.ideas.map(ideaRow).join('')}</ul>
      ${priceFoot()}`;
  } else if (sel.kind === 'event') {
    const e = state.eventsById.get(sel.id);
    const ideas = ideasForEvent(e);
    const lvl = ['', 'Green alert', 'Orange alert', 'Red alert'][e.level];
    html = `
      <div class="p-head" style="--cat:${LEVEL_COLOR[e.level]}">
        <div class="eyebrow"><span class="dot"></span>${esc(typeLabel(e.type))} · ${lvl}</div>
        <h2>${esc(e.title)}</h2>
        <div class="metric">${esc(e.place || '')}${e.place ? ' · ' : ''}${ago(e.time)} · ${esc(e.source)}</div>
      </div>
      ${e.detail ? `<p class="summary">${esc(e.detail)}</p>` : ''}
      ${e.near?.length ? `<div class="threats"><h3>Nearby hotspots</h3><ul>${e.near.map((n) => { const h = HOTSPOTS.find((x) => x.id === n.id); return `<li><button class="ev hs" data-hotspot="${h.id}" style="--cat:${CATEGORIES[h.cat].color}"><span class="ldot"></span><b>${esc(h.name)}</b><span>${esc(CATEGORIES[h.cat].short)} · ${km(n.d)} away</span></button></li>`; }).join('')}</ul></div>` : ''}
      <h3 class="ideas-h">Ideas</h3>
      ${ideas.length ? `<ul class="ideas">${ideas.map(ideaRow).join('')}</ul>` : '<p class="summary muted">Remote event with no curated market exposure. Nothing to trade here.</p>'}
      <p class="foot"><a href="${esc(e.gdacsUrl || e.url)}" target="_blank" rel="noopener">Source report ↗</a></p>
      ${priceFoot()}`;
  } else if (sel.kind === 'ticker') {
    const t = sel.id;
    const q = quote(t);
    const refs = [];
    for (const h of HOTSPOTS) for (const i of h.ideas) if (i.t === t) refs.push({ label: h.name, side: i.side, why: i.why, hotspot: h.id });
    for (const e of state.events) for (const i of ideasForEvent(e)) if (i.t === t) refs.push({ label: e.title, side: i.side, why: i.why, event: e.id });
    html = `
      <div class="p-head" style="--cat:#3fd0ff">
        <h2>${esc(t)} <small>${esc(q?.name || '')}</small></h2>
        ${q ? `<div class="metric big"><span class="px">${fmtPrice(q.last)}</span> <span class="chg ${q.chg >= 0 ? 'pos' : 'neg'}">${fmtPct(q.chg)} 1d</span> <span class="chg ${q.chg5 >= 0 ? 'pos' : 'neg'}">${fmtPct(q.chg5)} 5d</span> ${spark(q.closes, 96, 28)}</div>` : ''}
      </div>
      <h3 class="ideas-h">Appears in ${refs.length} signal${refs.length === 1 ? '' : 's'}</h3>
      <ul class="refs">${refs.map((r) => `<li><button class="ev" ${r.hotspot ? `data-hotspot="${r.hotspot}"` : `data-event="${esc(r.event)}"`}><span class="side ${r.side}">${r.side.toUpperCase()}</span><b>${esc(r.label)}</b><span>${esc(r.why)}</span></button></li>`).join('')}</ul>
      <div class="acts wide">
        <a href="https://finance.yahoo.com/quote/${encodeURIComponent(t)}" target="_blank" rel="noopener">Quote ↗</a>
        <a class="trade" href="${googleFinanceUrl(t)}" target="_blank" rel="noopener">Trade ${esc(t)} ↗</a>
      </div>
      ${priceFoot()}`;
  }
  p.innerHTML = `<button class="icon-btn close" id="panelClose" aria-label="Close panel">✕</button>${html}
    <p class="nfa-inline">Not financial advice. Theses are illustrative and can be wrong; prices may be delayed.</p>`;
  p.hidden = false;
  p.scrollTop = 0;
  document.body.classList.add('panel-open');
}

document.addEventListener('click', (e) => {
  const tk = e.target.closest('[data-ticker]');
  if (tk) { select({ kind: 'ticker', id: tk.dataset.ticker }); return; }
  const ev = e.target.closest('[data-event]');
  if (ev) { select({ kind: 'event', id: ev.dataset.event }); return; }
  const hs = e.target.closest('[data-hotspot]');
  if (hs) { select({ kind: 'hotspot', id: hs.dataset.hotspot }); return; }
  if (e.target.closest('#panelClose')) select(null);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.selected) select(null); });

// ---------- rail ----------
const FILTERS = [['all', 'All'], ['choke', 'Choke points'], ['infra', 'Infrastructure'], ['commodity', 'Commodities'], ['live', 'Live events']];
$('#filters').innerHTML = FILTERS.map(([k, l]) => `<button data-filter="${k}" class="${k === 'all' ? 'on' : ''}" style="--c:${CATEGORIES[k]?.color || '#9fb3c8'}">${l}</button>`).join('');
$('#filters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-filter]');
  if (!b) return;
  state.filter = b.dataset.filter;
  document.querySelectorAll('#filters button').forEach((x) => x.classList.toggle('on', x === b));
  renderList();
  applyLayerFilter();
  updateLabels();
});
$('#q').addEventListener('input', (e) => { state.query = e.target.value.trim().toLowerCase(); renderList(); updateLabels(); });

function passesFilter(h) {
  if (state.filter === 'live') return (state.links.get(h.id)?.length || 0) > 0;
  if (state.filter !== 'all' && h.cat !== state.filter) return false;
  return matchesQuery(h.name + ' ' + h.ideas.map((i) => i.t).join(' ') + ' ' + h.summary);
}
function matchesQuery(text) {
  if (!state.query) return true;
  return text.toLowerCase().includes(state.query);
}
function applyLayerFilter() {
  if (!map.isStyleLoaded()) return;
  const f = state.filter;
  const hsFilter = f === 'all' ? null : f === 'live' ? ['>', ['get', 'live'], 0] : ['==', ['get', 'cat'], f];
  for (const id of ['hot-core', 'hot-glow', 'hot-pulse-a', 'hot-pulse-b']) map.setFilter(id, hsFilter);
  const evVis = f === 'all' || f === 'live' ? 'visible' : 'none';
  for (const id of ['event-dot', 'event-pulse', 'event-area', 'tracks']) map.setLayoutProperty(id, 'visibility', evVis);
}

function renderList() {
  const hs = HOTSPOTS.filter(passesFilter).map((h) => ({ h, heat: heat(h, state.links, state.eventsById) })).sort((a, b) => b.heat - a.heat);
  const evs = state.filter === 'all' || state.filter === 'live'
    ? state.events.filter((e) => matchesQuery(`${e.title} ${e.place} ${ideasForEvent(e).map((i) => i.t).join(' ')}`)).sort((a, b) => b.level - a.level || b.time - a.time)
    : [];
  const sel = state.selected;
  const hsHtml = hs.map(({ h, heat: ht }) => {
    const live = state.links.get(h.id)?.length || 0;
    return `<li><button class="row ${sel?.id === h.id ? 'sel' : ''}" data-hotspot="${h.id}" style="--cat:${CATEGORIES[h.cat].color}">
      <span class="cdot" title="Heat ${ht.toFixed(1)}"></span>
      <span class="r-main"><b>${esc(h.name)}</b>${live ? `<i class="live">${live} live event${live > 1 ? 's' : ''} nearby</i>` : ''}<span class="r-meta">${esc(h.metric)}</span>
      <span class="chips">${h.ideas.slice(0, 4).map((i) => { const q = quote(i.t); return `<span class="chip ${i.side}">${esc(i.t)}${q ? ` <em class="${q.chg >= 0 ? 'pos' : 'neg'}">${fmtPct(q.chg)}</em>` : ''}</span>`; }).join('')}</span></span>
    </button></li>`;
  }).join('');
  const evHtml = evs.map((e) => `<li><button class="row ev-row ${sel?.id === e.id ? 'sel' : ''}" data-event="${esc(e.id)}" style="--cat:${LEVEL_COLOR[e.level]}">
      <span class="cdot"></span>
      <span class="r-main"><b>${esc(e.title)}</b><span class="r-meta">${esc(e.place || e.source)} · ${ago(e.time)}</span>
      <span class="chips">${ideasForEvent(e).slice(0, 3).map((i) => `<span class="chip ${i.side}">${esc(i.t)}</span>`).join('') || '<span class="chip none">no exposure</span>'}</span></span>
    </button></li>`).join('');
  $('#list').innerHTML = (hsHtml ? `<li class="sec">Hotspots</li>${hsHtml}` : '') + (evHtml ? `<li class="sec">Live events</li>${evHtml}` : '') || '<li class="empty">Nothing matches. Try a ticker like ZIM or a place like Panama.</li>';
}

// ---------- tape ----------
function renderTape() {
  const lb = leaderboard(state.events, state.links).slice(0, 18);
  const items = lb.map((s) => {
    const q = quote(s.t);
    return `<button class="titem" data-ticker="${esc(s.t)}"><b>${esc(s.t)}</b><span class="side ${s.side}">${s.side === 'long' ? '▲' : '▼'}</span>${q ? `<span>${fmtPrice(q.last)}</span><span class="${q.chg >= 0 ? 'pos' : 'neg'}">${fmtPct(q.chg)}</span>` : ''}</button>`;
  }).join('');
  $('#tapeTrack').innerHTML = items + `<span aria-hidden="true" class="dup">${items}</span>`;
}

// ---------- feed status ----------
function renderFeeds() {
  const labels = { usgs: 'USGS', gdacs: 'GDACS', eonet: 'NASA EONET', quotes: 'Prices' };
  const st = Object.values(state.feedStatus);
  const sd = new Date(snapshot.takenAt);
  const snapDate = sd.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) + `<span class="full">, ${sd.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })}</span>`;
  const detail = Object.entries(state.feedStatus).map(([k, v]) => `${labels[k]}: ${v === 'live' ? 'live' : v === 'loading' ? 'connecting' : 'saved data'}`).join('\n');
  let cls = 'snapshot', text = `<span class="full">Data as of </span>${snapDate}<span class="full"> UTC</span>`;
  if (st.includes('loading')) { cls = 'loading'; text = 'Connecting…'; }
  else if (st.every((v) => v === 'live')) { cls = 'live'; text = 'Live data'; }
  else if (st.some((v) => v === 'live')) { cls = 'partial'; text = 'Partly live'; }
  $('#feeds').innerHTML = `<span class="feed ${cls}" title="${esc(detail)}"><i></i><span>${text}</span></span>`;
}



window.addEventListener('resize', () => { labelMarkers.forEach((l) => { l.w = 0; }); map.setPadding(viewPadding()); updateLabels(); });

$('#themeBtn').addEventListener('click', () => {
  themeOverride = currentTheme() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('theme', themeOverride); } catch {}
  applyTheme();
});

// ---------- mobile rail ----------
$('#railOpen').addEventListener('click', () => $('#rail').classList.add('open'));
$('#railClose').addEventListener('click', () => $('#rail').classList.remove('open'));

// ---------- boot ----------
renderFeeds();
renderList();
renderTape();

async function goLive() {
  const parts = {};
  const results = await Promise.all(Object.keys(FEEDS).map(async (k) => [k, await loadFeed(k)]));
  for (const [k, r] of results) {
    state.feedStatus[k] = r.ok ? 'live' : 'snapshot';
    if (r.ok) parts[k] = r.events;
  }
  if (Object.keys(parts).length === 3) {
    state.events = mergeEvents(parts);
  } else if (Object.keys(parts).length) {
    // Partial live data: replace only the sources we reached, keep the snapshot for the rest.
    const srcOf = { usgs: 'USGS', gdacs: 'GDACS', eonet: 'NASA EONET' };
    const keep = state.events.filter((e) => !Object.keys(parts).some((k) => e.source === srcOf[k]));
    state.events = [...keep, ...Object.values(parts).flat()];
  }
  relink();
  const q = await loadQuotes(allSymbols());
  state.feedStatus.quotes = q.ok ? 'live' : 'snapshot';
  if (q.ok) state.quotes = { asOf: q.asOf, source: q.source, q: { ...state.quotes.q, ...q.q } };
  renderFeeds();
  renderList();
  renderTape();
  refreshMapData();
  if (state.selected?.kind === 'event' && !state.eventsById.has(state.selected.id)) select(null);
  else if (state.selected) renderPanel();
}
map.once('load', goLive);
setInterval(goLive, 5 * 60 * 1000);
