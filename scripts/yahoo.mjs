// Server-side helpers (Node 18+): Yahoo Finance daily closes and feed passthrough. Used by the
// Vite dev/preview middleware and by the snapshot script. Browsers can't call Yahoo directly (CORS).
const UA = { 'User-Agent': 'Mozilla/5.0 (GodsEyeMarkets/1.0)' };

export async function fetchQuotes(symbols) {
  const q = {};
  let asOf = null;
  for (let i = 0; i < symbols.length; i += 20) {
    const batch = symbols.slice(i, i + 20);
    const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${batch.join(',')}&range=5d&interval=1d`;
    const r = await fetch(url, { headers: UA });
    if (!r.ok) throw new Error(`Yahoo HTTP ${r.status}`);
    const j = await r.json();
    for (const res of j.spark?.result || []) {
      const resp = res.response?.[0];
      const closes = resp?.indicators?.quote?.[0]?.close?.filter((c) => c != null).map((c) => +c.toFixed(2));
      if (!closes?.length) continue;
      const m = resp.meta;
      // During market hours the last close is the live price.
      if (m.regularMarketPrice) closes[closes.length - 1] = +m.regularMarketPrice.toFixed(2);
      q[res.symbol] = [m.shortName || m.longName || res.symbol, closes];
      const ts = resp.timestamp?.[resp.timestamp.length - 1];
      if (ts && (!asOf || ts * 1000 > asOf)) asOf = ts * 1000;
    }
  }
  return { asOf: asOf ? new Date(asOf).toISOString().slice(0, 10) : null, source: 'Yahoo Finance', q };
}

export async function fetchText(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.text();
}
