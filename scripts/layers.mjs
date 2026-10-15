// Physical-activity layers gathered at build time (Node 22), stored in the snapshot as
// { takenAt, spots: { hotspotId: { now, base } } }. `base` is a running average across runs,
// so each layer's signal is "how unusual is right now" rather than a raw count.
import { HOTSPOTS } from '../src/hotspots.js';

const ema = (prevBase, now) => (prevBase == null ? now : +(prevBase * 0.8 + now * 0.2).toFixed(3));

// Aviation: airborne aircraft within ~2° of each hotspot from OpenSky's keyless API.
// Anonymous use is capped at 400 credits a day (1 per box), so refresh at most hourly.
export async function fetchAviation(prev) {
  if (prev?.takenAt && Date.now() - Date.parse(prev.takenAt) < 55 * 60e3) return prev;
  const spots = {};
  for (const h of HOTSPOTS) {
    const box = `lamin=${h.lat - 2}&lomin=${h.lon - 2.4}&lamax=${h.lat + 2}&lomax=${h.lon + 2.4}`;
    try {
      const r = await fetch(`https://opensky-network.org/api/states/all?${box}`, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      const now = (j.states || []).filter((s) => !s[8]).length; // s[8] = on_ground
      spots[h.id] = { now, base: ema(prev?.spots?.[h.id]?.base, now) };
    } catch (e) {
      if (prev?.spots?.[h.id]) spots[h.id] = prev.spots[h.id];
      console.warn(`aviation ${h.id}: ${e.message}`);
    }
  }
  return Object.keys(spots).length ? { takenAt: new Date().toISOString(), source: 'OpenSky Network', spots } : prev || null;
}

// Maritime: AIS position reports around ports and straits from aisstream.io (free key).
// Listens for a short window and measures congestion: the share of vessels anchored or stopped.
export const MARITIME_SPOTS = ['hormuz', 'bab', 'suez', 'panama', 'malacca', 'taiwan', 'shanghai', 'rotterdam', 'lalb', 'bosporus', 'gulfcoast', 'luzon'];

export async function fetchMaritime(prev, key, { seconds = 60, url = 'wss://stream.aisstream.io/v0/stream' } = {}) {
  if (!key) return prev || null;
  const spots = HOTSPOTS.filter((h) => MARITIME_SPOTS.includes(h.id));
  const boxes = spots.map((h) => [[h.lat - 1, h.lon - 1.2], [h.lat + 1, h.lon + 1.2]]);
  const seen = new Map(spots.map((h) => [h.id, new Map()]));
  await new Promise((resolve) => {
    const ws = new WebSocket(url);
    let closed = false;
    const done = () => { if (closed) return; closed = true; clearTimeout(timer); try { ws.close(); } catch {} resolve(); };
    let timer = setTimeout(done, seconds * 1000);
    ws.onclose = (e) => { if (!closed) console.warn('maritime: socket closed', e.code, e.reason || ''); done(); };
    ws.onopen = () => ws.send(JSON.stringify({ APIKey: key, BoundingBoxes: boxes, FilterMessageTypes: ['PositionReport'] }));
    ws.onmessage = async (m) => {
      let d;
      try { d = JSON.parse(typeof m.data === 'string' ? m.data : await m.data.text()); } catch { return; }
      const p = d.Message?.PositionReport;
      const meta = d.MetaData;
      if (!p || !meta) return;
      const lat = meta.latitude ?? p.Latitude, lon = meta.longitude ?? p.Longitude;
      const stopped = p.NavigationalStatus === 1 || p.NavigationalStatus === 5 || p.Sog < 0.5;
      spots.forEach((h, i) => {
        const [[a, b], [c, e]] = boxes[i];
        if (lat >= a && lat <= c && lon >= b && lon <= e) seen.get(h.id).set(meta.MMSI, stopped);
      });
    };
    ws.onerror = (e) => { console.warn('maritime: socket error', e.message || ''); done(); };
  });
  const out = {};
  for (const h of spots) {
    const v = [...seen.get(h.id).values()];
    if (v.length < 5) { if (prev?.spots?.[h.id]) out[h.id] = prev.spots[h.id]; continue; }
    const now = +(v.filter(Boolean).length / v.length).toFixed(3);
    out[h.id] = { now, base: ema(prev?.spots?.[h.id]?.base, now), ships: v.length };
  }
  return Object.keys(out).length ? { takenAt: new Date().toISOString(), source: 'aisstream.io', spots: out } : prev || null;
}
