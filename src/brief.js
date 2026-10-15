// The start screen: today's headlines and what the globe is detecting, typed out like a wire
// report, with the day's movers and the countries in the news popping in alongside.
import { HOTSPOTS } from './hotspots.js';
import { hotspotLayers } from './signals.js';
import { countriesIn, countryName, flagUrl } from './countries.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const sentence = (t) => (/[.?!]$/.test(t) ? t : t + '.');
const pct = (x) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}%`;
const list = (xs) => (xs.length < 3 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

// Paragraphs of plain text, built only from data the app actually has.
export function composeBrief(state, quote) {
  const paras = [];
  const heads = state.headlines?.articles || [];
  if (heads.length) paras.push(heads.slice(0, 3).map((a) => sentence(a.title)).join(' '));

  const seen = [];
  const press = HOTSPOTS.map((h) => ({ h, L: hotspotLayers(h, state) }));
  for (const { h, L } of press.filter((x) => x.L.air >= 0.3).sort((a, b) => b.L.air - a.L.air).slice(0, 2)) {
    seen.push(`Air traffic over the ${h.name.replace(/^the /i, '')} is ${Math.round(L.air * 100)}% below its usual level.`);
  }
  for (const { h, L } of press.filter((x) => x.L.sea > 0.15).sort((a, b) => b.L.sea - a.L.sea).slice(0, 2)) {
    seen.push(`${Math.round(L.seaRaw.now * 100)}% of ships near ${h.name} are stopped, against ${Math.round(L.seaRaw.base * 100)}% normally.`);
  }
  const big = state.events.filter((e) => e.level >= 2 && e.near?.length).sort((a, b) => b.level - a.level || a.near[0].d - b.near[0].d).slice(0, 3);
  for (const e of big) {
    const h = HOTSPOTS.find((x) => x.id === e.near[0].id);
    const multi = /,|\+\d/.test(e.place || '') && e.type !== 'EQ';
    const where = multi ? '' : (e.place || '').split(',').at(-1).trim();
    const title = e.title.length > 60 ? `${e.title.split(',')[0]} and neighbours` : e.title;
    seen.push(`${title}${where && !title.includes(where) ? ` near ${where}` : ''} is within reach of ${h.name}.`);
  }
  if (!seen.length) seen.push(`${state.events.length} live hazards are on the globe, none close to a critical choke point.`);
  paras.push(seen.join(' '));

  const movers = moversOf(state, quote);
  const buys = state.ratings.filter((r) => r.rating === 'buy').slice(0, 3).map((r) => r.t);
  const sells = state.ratings.filter((r) => r.rating === 'sell').slice(0, 2).map((r) => r.t);
  const mk = [];
  if (movers.length) mk.push(`Among the names we track, ${list(movers.slice(0, 3).map((m) => `${m.t} ${pct(m.chg)}`))} moved most today.`);
  if (buys.length) mk.push(`The long-term buy list is led by ${list(buys)}${sells.length ? `; the sell list by ${list(sells)}` : ''}.`);
  if (mk.length) paras.push(mk.join(' '));
  return paras;
}

export function moversOf(state, quote) {
  return Object.keys(state.quotes.q).map((t) => ({ t, ...quote(t) })).filter((q) => q.last)
    .sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg)).slice(0, 6);
}

// Countries in today's news, with the leading story and its image. Falls back to the
// countries named in live hazard reports so the row is never empty.
export function briefCountries(state) {
  const fromNews = state.headlines?.countries || [];
  if (fromNews.length) return fromNews.slice(0, 6);
  const tally = new Map();
  for (const e of state.events) {
    const cs = countriesIn(`${e.title} ${e.place}`);
    if (cs.length > 3) continue; // continent-wide drought lists say little about any one country
    for (const c of cs) {
      if (!tally.has(c)) tally.set(c, { code: c, n: 0, title: e.title, url: e.gdacsUrl || e.url, domain: e.source, image: '' });
      tally.get(c).n++;
    }
  }
  return [...tally.values()].sort((a, b) => b.n - a.n).slice(0, 6);
}

export function openBrief(state, quote, { onClose }) {
  const root = document.getElementById('brief');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const now = new Date();
  root.querySelector('#bDate').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const paras = composeBrief(state, quote);
  const text = root.querySelector('#bText');
  text.innerHTML = paras.map(() => '<p></p>').join('');
  const ps = [...text.querySelectorAll('p')];

  const movers = moversOf(state, quote);
  root.querySelector('#bMovers').innerHTML = movers.map((m, i) => `
    <button class="b-mover ${m.chg >= 0 ? 'up' : 'down'}" data-ticker="${esc(m.t)}" style="--d:${0.6 + i * 0.35}s">
      <b>${esc(m.t)}</b><span>${m.chg >= 0 ? '▲' : '▼'} ${pct(m.chg)}</span><small>${esc(m.name || '')}</small>
    </button>`).join('');

  root.querySelector('#bFlags').innerHTML = briefCountries(state).map((c, i) => `
    <a class="b-flag" href="${esc(c.url)}" target="_blank" rel="noopener" style="--d:${1.4 + i * 0.6}s">
      <span class="flag"><img src="${flagUrl(c.code)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>
      <span class="b-fmeta"><b>${esc(countryName(c.code))}</b><span>${esc(c.title)}</span><small>${esc(c.domain || '')}</small></span>
      ${c.image ? `<img class="b-photo" src="${esc(c.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
    </a>`).join('');

  root.hidden = false;
  document.body.classList.add('brief-open');
  root.classList.remove('done', 'leaving');
  requestAnimationFrame(() => root.classList.add('on'));

  // Typewriter: one character at a time across the paragraphs; a click finishes it at once.
  let pi = 0, ci = 0, timer = null, finished = false;
  const finish = () => {
    clearTimeout(timer);
    ps.forEach((p, i) => { p.textContent = paras[i]; });
    finished = true;
    root.classList.add('done');
  };
  const tick = () => {
    if (pi >= paras.length) return finish();
    const para = paras[pi];
    ci = Math.min(para.length, ci + (para[ci] === ' ' ? 2 : 1));
    ps[pi].textContent = para.slice(0, ci);
    ps[pi].classList.add('typing');
    if (ci >= para.length) { ps[pi].classList.remove('typing'); pi++; ci = 0; timer = setTimeout(tick, 420); return; }
    const ch = para[ci - 1];
    timer = setTimeout(tick, /[.?!]/.test(ch) ? 260 : /[,;:]/.test(ch) ? 110 : 16 + Math.random() * 18);
  };
  if (reduce) finish(); else timer = setTimeout(tick, 500);

  const close = (ticker) => {
    clearTimeout(timer);
    root.classList.add('leaving');
    document.body.classList.remove('brief-open');
    setTimeout(() => { root.hidden = true; root.classList.remove('on', 'leaving'); }, reduce ? 0 : 450);
    root.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
    onClose?.(ticker);
  };
  const onClick = (e) => {
    if (e.target.closest('#bEnter')) return close();
    const tk = e.target.closest('[data-ticker]');
    if (tk) return close(tk.dataset.ticker);
    if (e.target.closest('a')) return;
    if (!finished) finish();
  };
  const onKey = (e) => { if (e.key === 'Escape' || (finished && e.key === 'Enter')) close(); else if (!finished && e.key === ' ') { e.preventDefault(); finish(); } };
  root.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
}
