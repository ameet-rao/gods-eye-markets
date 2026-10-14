// Spatial-to-financial logic: links live events to curated hotspots and builds ticker ideas for each.
import { HOTSPOTS, EVENT_THEMES, REGIONS } from './hotspots.js';
import { distanceKm } from './feeds.js';

export function allSymbols() {
  const s = new Set();
  const add = (ideas) => ideas.forEach((i) => s.add(i.t));
  HOTSPOTS.forEach((h) => add(h.ideas));
  Object.values(EVENT_THEMES).forEach((t) => add(t.ideas));
  REGIONS.forEach((r) => add(r.ideas));
  return [...s];
}

// How far an event's effects plausibly reach, by type and strength.
export function reachKm(e) {
  switch (e.type) {
    case 'EQ': return e.mag >= 7.5 ? 900 : e.mag >= 7 ? 650 : e.mag >= 6.5 ? 450 : 300;
    case 'TC': return 900;
    case 'ST': return 600;
    case 'VO': return 500;
    case 'FL': return 500;
    case 'DR': return 1600;
    case 'WF': return 300;
    default: return 400;
  }
}

export function linkEvents(events) {
  const links = new Map(HOTSPOTS.map((h) => [h.id, []]));
  for (const e of events) {
    e.near = [];
    const reach = reachKm(e);
    const pts = e.track ? [[e.lon, e.lat], ...e.track.slice(-6)] : [[e.lon, e.lat]];
    for (const h of HOTSPOTS) {
      const d = Math.min(...pts.map(([lon, lat]) => distanceKm(lat, lon, h.lat, h.lon)));
      if (d <= reach) {
        e.near.push({ id: h.id, d });
        links.get(h.id).push({ id: e.id, d });
      }
    }
    e.near.sort((a, b) => a.d - b.d);
  }
  return links;
}

// Heat: base structural risk plus live pressure from nearby events.
export function heat(h, links, eventsById) {
  const live = (links.get(h.id) || []).reduce((s, l) => s + (eventsById.get(l.id)?.level || 1), 0);
  return h.risk + live * 1.5;
}

export function ideasForEvent(e) {
  const out = [];
  const seen = new Set();
  const push = (i, via) => { if (!seen.has(i.t)) { seen.add(i.t); out.push({ ...i, via }); } };
  const region = REGIONS.find((r) => e.lat >= r.box[0] && e.lat <= r.box[2] && e.lon >= r.box[1] && e.lon <= r.box[3]);
  if (region) region.ideas.forEach((i) => push(i, region.name));
  for (const n of e.near || []) {
    const h = HOTSPOTS.find((x) => x.id === n.id);
    h.ideas.slice(0, 2).forEach((i) => push(i, h.name));
  }
  // A remote, low-alert event (mid-ocean quake, weak storm at sea) has no credible market read.
  if (!region && !(e.near || []).length && e.level < 2) return [];
  (EVENT_THEMES[e.type]?.ideas || []).forEach((i) => push(i, EVENT_THEMES[e.type].label + ' playbook'));
  return out.slice(0, 7);
}

// Ticker leaderboard: how many active signals point at each symbol, and in which direction.
export function leaderboard(events, links) {
  const score = new Map();
  const bump = (t, side, w) => {
    const s = score.get(t) || { t, long: 0, short: 0 };
    s[side] += w;
    score.set(t, s);
  };
  for (const h of HOTSPOTS) {
    const live = (links.get(h.id) || []).length;
    for (const i of h.ideas) bump(i.t, i.side, 0.5 + live);
  }
  for (const e of events) for (const i of ideasForEvent(e)) bump(i.t, i.side, e.level * 0.6);
  return [...score.values()]
    .map((s) => ({ ...s, net: s.long - s.short, side: s.long >= s.short ? 'long' : 'short', weight: Math.max(s.long, s.short) }))
    .sort((a, b) => b.weight - a.weight);
}
