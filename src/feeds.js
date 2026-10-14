// Live crisis feeds (all keyless) normalized into one event shape:
// { id, type, title, place, lat, lon, time, level (1 green, 2 orange, 3 red), mag, detail, url, source, track }

export const FEEDS = {
  usgs: {
    label: 'USGS earthquakes',
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson',
  },
  gdacs: {
    label: 'GDACS disaster alerts',
    url: () => {
      const to = new Date();
      const from = new Date(to.getTime() - 30 * 864e5);
      const d = (x) => x.toISOString().slice(0, 10);
      return `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ;TC;FL;VO;DR;WF&alertlevel=Orange;Red&fromDate=${d(from)}&toDate=${d(to)}`;
    },
  },
  eonet: {
    label: 'NASA EONET',
    url: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=20&category=severeStorms,volcanoes&limit=40',
  },
};

const LEVEL = { green: 1, yellow: 1, orange: 2, red: 3 };
const R = 6371;
export function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function normalizeUsgs(json) {
  const quakes = (json.features || [])
    .map((f) => {
      const p = f.properties;
      const [lon, lat, depth] = f.geometry.coordinates;
      const lvl = LEVEL[p.alert] || (p.mag >= 7 ? 3 : p.mag >= 6.5 ? 2 : 1);
      return {
        id: 'usgs-' + f.id, type: 'EQ', source: 'USGS',
        title: `M${p.mag.toFixed(1)} earthquake`, place: p.place || 'Unknown location',
        lat, lon, time: p.time, level: lvl, mag: p.mag,
        detail: `Depth ${Math.round(depth)} km${p.tsunami ? ' · tsunami flag' : ''}${p.alert ? ' · PAGER ' + p.alert : ''}`,
        url: p.url,
      };
    })
    .filter((q) => q.mag >= 5.8 || q.level >= 2)
    .sort((a, b) => b.mag - a.mag);
  // Fold aftershocks into the largest quake within 250 km.
  const kept = [];
  for (const q of quakes) {
    const parent = kept.find((k) => distanceKm(k.lat, k.lon, q.lat, q.lon) < 250);
    if (parent) parent.aftershocks = (parent.aftershocks || 0) + 1;
    else kept.push(q);
  }
  for (const k of kept) if (k.aftershocks) k.detail += ` · ${k.aftershocks} more M5.8+ nearby`;
  return kept;
}

const GDACS_TYPE_NAME = { TC: 'Tropical cyclone', FL: 'Flood', VO: 'Volcanic eruption', DR: 'Drought', WF: 'Wildfire', EQ: 'Earthquake' };

export function normalizeGdacs(json) {
  return (json.features || []).map((f) => {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const base = (p.eventname || '').replace(/-\d+$/, '');
    let title = p.name || GDACS_TYPE_NAME[p.eventtype];
    if (p.eventtype === 'TC' && base) title = `Tropical Cyclone ${base[0]}${base.slice(1).toLowerCase()}`;
    if (p.eventtype === 'VO') title = `${base || 'Volcanic'} eruption`;
    return {
      id: `gdacs-${p.eventtype}-${p.eventid}`, type: p.eventtype, source: 'GDACS',
      title, place: shortCountry(p.country), lat, lon,
      time: Date.parse((p.todate || p.fromdate) + 'Z'), level: LEVEL[String(p.alertlevel).toLowerCase()] || 1,
      mag: p.severitydata?.severityunit === 'M' ? p.severitydata.severity : undefined,
      detail: p.severitydata?.severitytext || '',
      url: p.url?.report, stormName: p.eventtype === 'TC' ? base.toLowerCase() : undefined,
    };
  });
}

function shortCountry(c = '') {
  const parts = c.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length > 3 ? `${parts.slice(0, 3).join(', ')} +${parts.length - 3}` : parts.join(', ');
}

export function normalizeEonet(json) {
  return (json.events || []).map((e) => {
    const cat = e.categories?.[0]?.id;
    const type = cat === 'volcanoes' ? 'VO' : cat === 'wildfires' ? 'WF' : 'ST';
    const pts = (e.geometry || []).filter((g) => g.type === 'Point');
    const last = pts[pts.length - 1];
    if (!last) return null;
    const [lon, lat] = last.coordinates;
    const kts = last.magnitudeUnit === 'kts' ? last.magnitudeValue : null;
    const isTc = /hurricane|typhoon|cyclone|tropical/i.test(e.title);
    const level = kts ? (kts >= 96 ? 3 : kts >= 64 ? 2 : 1) : 1;
    return {
      id: 'eonet-' + e.id, type: isTc ? 'TC' : type, source: 'NASA EONET',
      title: e.title, place: '', lat, lon, time: Date.parse(last.date), level,
      detail: kts ? `Max sustained wind ${kts} kt (${Math.round(kts * 1.852)} km/h)` : '',
      url: e.sources?.[0]?.url || e.link,
      track: pts.length > 1 ? pts.map((g) => g.coordinates) : undefined,
      stormName: isTc ? e.title.split(' ').pop().toLowerCase() : undefined,
    };
  }).filter(Boolean);
}

// Merge feeds: USGS owns earthquakes, EONET owns storm tracks, GDACS adds alert levels and everything else.
export function mergeEvents({ usgs = [], gdacs = [], eonet = [] }, now = Date.now()) {
  const out = [...usgs];
  const storms = new Map(eonet.filter((e) => e.stormName).map((e) => [e.stormName, e]));
  for (const g of gdacs) {
    if (g.type === 'EQ' && usgs.length) {
      const twin = usgs.find((q) => distanceKm(q.lat, q.lon, g.lat, g.lon) < 250);
      if (twin) { twin.level = Math.max(twin.level, g.level); continue; }
    }
    if (g.type === 'TC' && storms.has(g.stormName)) {
      const s = storms.get(g.stormName);
      s.level = Math.max(s.level, g.level);
      s.gdacsUrl = g.url;
      s.place = s.place || g.place;
      continue;
    }
    out.push(g);
  }
  out.push(...eonet);
  // Drop stale storms (no update in 10 days) so dissipated systems don't linger.
  return out.filter((e) => !(e.type === 'TC' || e.type === 'ST') || now - e.time < 10 * 864e5);
}

async function fetchJson(url, ms = 7000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

// Try the local dev proxy first (no CORS issues), then the public endpoint directly.
export async function loadFeed(key) {
  const feed = FEEDS[key];
  const url = typeof feed.url === 'function' ? feed.url() : feed.url;
  const attempts = [`./api/feed?src=${key}`, url];
  for (const a of attempts) {
    try {
      const json = await fetchJson(a);
      const norm = { usgs: normalizeUsgs, gdacs: normalizeGdacs, eonet: normalizeEonet }[key](json);
      return { ok: true, events: norm };
    } catch (e) { /* try next */ }
  }
  return { ok: false, events: [] };
}

export async function loadQuotes(symbols) {
  try {
    const json = await fetchJson(`./api/quotes?symbols=${symbols.join(',')}`, 9000);
    if (json && json.q && Object.keys(json.q).length) return { ok: true, ...json };
  } catch (e) { /* fall through */ }
  return { ok: false };
}
