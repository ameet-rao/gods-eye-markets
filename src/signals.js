// The signal engine. Phase 1 scores each layer independently per hotspot; phase 2 fuses the
// layers across every place a ticker is exposed to, then checks the market for confirmation.
//
//   Infrastructure  how critical the place is (curated, structural, long-term)
//   Environment     USGS / GDACS / NASA EONET events in range of it
//   Aviation        OpenSky airborne traffic vs its running average (a drop = disruption)
//   Maritime        AIS share of ships anchored or stopped vs its running average (a rise = congestion)
//   Market          5-day price trend agreeing or fighting the thesis
import { HOTSPOTS } from './hotspots.js';
import { ideasForEvent } from './ideas.js';

export const LAYERS = [
  { key: 'infra', label: 'Infrastructure', source: 'Curated choke points and assets' },
  { key: 'env', label: 'Environment', source: 'USGS, GDACS, NASA EONET' },
  { key: 'air', label: 'Aviation', source: 'OpenSky Network' },
  { key: 'sea', label: 'Maritime', source: 'AIS via aisstream.io' },
  { key: 'mkt', label: 'Market', source: 'Yahoo Finance / Finnhub' },
];

const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

// Phase 1: each layer on its own, 0 (calm) to 1 (maximum pressure); null when there is no data.
export function hotspotLayers(h, { links, eventsById, layers }) {
  const evs = (links.get(h.id) || []).map((l) => eventsById.get(l.id)).filter(Boolean);
  const env = clamp(evs.reduce((s, e) => s + e.level, 0) / 4);
  const a = layers?.aviation?.spots?.[h.id];
  const air = a && a.base >= 8 ? clamp(1 - a.now / a.base) : null;
  const m = layers?.maritime?.spots?.[h.id];
  const sea = m && m.base > 0.02 ? clamp(m.now / m.base - 1) : null;
  return { infra: h.risk / 5, env, air, sea, events: evs.length, airRaw: a, seaRaw: m };
}

// Phase 2: fuse per ticker. Structural exposure is the long-term thesis; live layers multiply it.
export function rateTickers(ctx, quote) {
  const per = new Map();
  const get = (t) => {
    if (!per.has(t)) per.set(t, { t, score: 0, infra: 0, env: 0, air: null, sea: null, at: {}, reasons: [] });
    return per.get(t);
  };
  for (const h of HOTSPOTS) {
    const L = hotspotLayers(h, ctx);
    const pressure = L.env + (L.air || 0) + (L.sea || 0);
    for (const i of h.ideas) {
      const sgn = i.side === 'long' ? 1 : -1;
      const c = L.infra * (1 + 1.5 * pressure);
      const r = get(i.t);
      r.score += sgn * c;
      // Each layer remembers which exposure drives it, so the panel can say where.
      if (L.infra > r.infra || !r.at.infra) { r.infra = L.infra; r.at.infra = h.id; }
      if (L.env > r.env) { r.env = L.env; r.at.env = h.id; }
      if (L.air != null && L.air >= (r.air ?? -1)) { r.air = L.air; r.at.air = h.id; }
      if (L.sea != null && L.sea >= (r.sea ?? -1)) { r.sea = L.sea; r.at.sea = h.id; }
      r.reasons.push({ w: c, side: i.side, hotspot: h.id, text: h.name + (pressure > 0.05 ? ` · live pressure ${Math.round(pressure * 100)}` : '') });
    }
  }
  // Event playbooks reach tickers that no hotspot covers (e.g. a hurricane hitting Florida insurers).
  for (const e of ctx.events) {
    for (const i of ideasForEvent(e)) {
      if (i.via && HOTSPOTS.some((h) => h.name === i.via)) continue;
      const sgn = i.side === 'long' ? 1 : -1;
      const c = 0.25 * e.level;
      const r = get(i.t);
      r.score += sgn * c;
      if (clamp(e.level / 3) > r.env) { r.env = clamp(e.level / 3); r.at.env = null; r.envEvent = e.title; }
      r.reasons.push({ w: c, side: i.side, event: e.id, text: e.title });
    }
  }
  const out = [];
  for (const r of per.values()) {
    const q = quote(r.t);
    r.mkt = q ? q.chg5 : null;
    r.side = r.score >= 0 ? 'long' : 'short';
    // Market confirmation: trend in the thesis direction adds a little; trend against it subtracts.
    const confirm = q ? clamp((r.side === 'long' ? q.chg5 : -q.chg5) / 10, -1, 1) : 0;
    r.conviction = Math.abs(r.score) * (1 + 0.15 * confirm);
    r.reasons.sort((a, b) => b.w - a.w);
    out.push(r);
  }
  const longs = out.filter((r) => r.side === 'long').sort((a, b) => b.conviction - a.conviction);
  const cut = longs[Math.max(0, Math.ceil(longs.length / 3) - 1)]?.conviction ?? 0;
  for (const r of out) {
    if (r.side === 'short') { r.rating = 'sell'; r.why = 'Net short across its exposures'; continue; }
    const ranAway = r.mkt != null && r.mkt > 12;
    if (r.conviction >= cut && !ranAway) { r.rating = 'buy'; r.why = 'Strong structural exposure with live support'; }
    else { r.rating = 'hold'; r.why = ranAway ? `Thesis intact but up ${r.mkt.toFixed(1)}% in 5 days` : 'Positive thesis, weaker live signals'; }
  }
  return out.sort((a, b) => b.conviction - a.conviction);
}
