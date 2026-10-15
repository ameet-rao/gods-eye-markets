// Daily global headlines for the start screen, from GDELT's keyless article search (last 24h).
import { countriesIn } from '../src/countries.js';

const QUERY = '(markets OR economy OR oil OR war OR shipping OR tariffs OR sanctions OR earthquake OR hurricane) sourcelang:english';
const URL_ = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(QUERY)}&mode=artlist&maxrecords=75&format=json&sort=hybridrel&timespan=24h`;

// GDELT spaces out punctuation ("US - Iran stalemate : what next ?"); put it back.
export function cleanTitle(t = '', domain = '') {
  let s = t.replace(/\s+/g, ' ').trim();
  // Drop a trailing " - Site Name" when it names the publisher.
  const site = domain.replace(/^www\./, '').split('.')[0].toLowerCase();
  s = s.replace(/\s[–-]\s([^–-]+)$/, (m, tail) => {
    const k = tail.toLowerCase().replace(/[^a-z]/g, '');
    return site && (k.includes(site) || site.includes(k.replace(/^the/, ''))) ? '' : m;
  });
  s = s.replace(/\s+([,.:;?!%)…])/g, '$1').replace(/\(\s+/g, '(')
    .replace(/(\d)\. (\d)/g, '$1.$2').replace(/(\w) - (\w)/g, '$1-$2').replace(/\$ (\d)/g, '$$$1');
  // Keep the longest part of "Site | Headline | Section" style titles.
  if (s.includes(' | ')) s = s.split(' | ').sort((a, b) => b.length - a.length)[0];
  return s.trim();
}

const junkImage = (u = '') => !u || /logo|favicon|og\.png|fb\.png|default|placeholder/i.test(u) || /^https?:\/\/[^/]+\/?$/.test(u);
const junkTitle = (t) => t.length < 28 || /quote of the day|horoscope|mortgage rates today|podcast|political news and/i.test(t);

export function digest(articles) {
  const seen = new Set();
  const list = [];
  for (const a of articles) {
    const title = cleanTitle(a.title, a.domain);
    const key = title.toLowerCase().replace(/[^a-z]/g, '').slice(0, 60);
    if (junkTitle(title) || seen.has(key)) continue;
    seen.add(key);
    list.push({ title, url: a.url, domain: a.domain, image: junkImage(a.socialimage) ? '' : a.socialimage.replace(/^http:/, 'https:'), countries: countriesIn(title) });
  }
  const tally = new Map();
  for (const a of list) for (const c of a.countries) tally.set(c, (tally.get(c) || 0) + 1);
  // Each country leads with a different story where possible, preferring one with a photo.
  const used = new Set();
  const countries = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([code, n]) => {
    const mine = list.filter((a) => a.countries.includes(code));
    const lead = mine.find((a) => a.image && !used.has(a.url)) || mine.find((a) => !used.has(a.url)) || mine[0];
    used.add(lead.url);
    return { code, n, title: lead.title, url: lead.url, domain: lead.domain, image: lead.image };
  });
  return { articles: list.slice(0, 24), countries };
}

export async function fetchHeadlines(prev) {
  try {
    const r = await fetch(URL_, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 (GodsEyeMarkets/1.0)' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = JSON.parse(await r.text());
    const d = digest(j.articles || []);
    if (!d.articles.length) throw new Error('no articles');
    return { takenAt: new Date().toISOString(), source: 'GDELT', ...d };
  } catch (e) {
    console.warn(`headlines: ${e.message}, keeping previous`);
    return prev || null;
  }
}
