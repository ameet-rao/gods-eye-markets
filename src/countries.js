// Country detection for headlines and events: ISO code, display name, and the words that mean it.
export const COUNTRIES = [
  ['us', 'United States', /\b(United States|U\.S\.|US|USA|American|Washington|Trump|Fed)\b/],
  ['cn', 'China', /\b(China|Chinese|Beijing|Xi)\b/],
  ['ir', 'Iran', /\b(Iran|Iranian|Tehran)\b/],
  ['sa', 'Saudi Arabia', /\b(Saudi|Riyadh|Aramco)\b/],
  ['ye', 'Yemen', /\b(Yemen|Yemeni|Houthis?|Aden)\b/],
  ['il', 'Israel', /\b(Israel|Israeli|Gaza)\b/],
  ['ru', 'Russia', /\b(Russia|Russian|Moscow|Kremlin|Putin)\b/],
  ['ua', 'Ukraine', /\b(Ukraine|Ukrainian|Kyiv)\b/],
  ['in', 'India', /\b(India|Indian|Nifty|Sensex|Rupee|Modi)\b/],
  ['jp', 'Japan', /\b(Japan|Japanese|Tokyo|Nikkei|Yen)\b/],
  ['tw', 'Taiwan', /\b(Taiwan|Taiwanese|Taipei|TSMC)\b/],
  ['kr', 'South Korea', /\b(South Korea|Korean|Seoul)\b/],
  ['de', 'Germany', /\b(Germany|German|Berlin|Bundesbank)\b/],
  ['gb', 'United Kingdom', /\b(UK|U\.K\.|Britain|British|London|England)\b/],
  ['fr', 'France', /\b(France|French|Paris)\b/],
  ['eu', 'European Union', /\b(EU|European Union|Brussels|ECB|Eurozone)\b/],
  ['tr', 'Turkey', /\b(Turkey|Turkish|Türkiye|Ankara|Istanbul|Bosporus)\b/],
  ['eg', 'Egypt', /\b(Egypt|Egyptian|Cairo|Suez)\b/],
  ['ae', 'United Arab Emirates', /\b(UAE|Emirates|Emirati|Dubai|Abu Dhabi)\b/],
  ['qa', 'Qatar', /\b(Qatar|Qatari|Doha)\b/],
  ['ro', 'Romania', /\b(Romania|Romanian)\b/],
  ['ca', 'Canada', /\b(Canada|Canadian|Alberta|Ottawa)\b/],
  ['mx', 'Mexico', /\b(Mexico|Mexican)\b/],
  ['br', 'Brazil', /\b(Brazil|Brazilian)\b/],
  ['cl', 'Chile', /\b(Chile|Chilean)\b/],
  ['ar', 'Argentina', /\b(Argentina|Argentine)\b/],
  ['ve', 'Venezuela', /\b(Venezuela|Venezuelan)\b/],
  ['pa', 'Panama', /\b(Panama)\b/],
  ['ph', 'Philippines', /\b(Philippines|Philippine|Manila)\b/],
  ['id', 'Indonesia', /\b(Indonesia|Indonesian|Jakarta)\b/],
  ['au', 'Australia', /\b(Australia|Australian)\b/],
  ['pk', 'Pakistan', /\b(Pakistan|Pakistani)\b/],
  ['ng', 'Nigeria', /\b(Nigeria|Nigerian)\b/],
  ['za', 'South Africa', /\b(South Africa|South African)\b/],
  ['iq', 'Iraq', /\b(Iraq|Iraqi|Baghdad)\b/],
  ['sg', 'Singapore', /\b(Singapore)\b/],
  ['vn', 'Vietnam', /\b(Vietnam|Vietnamese)\b/],
  ['kz', 'Kazakhstan', /\b(Kazakhstan|Kazakh)\b/],
  ['nl', 'Netherlands', /\b(Netherlands|Dutch|Rotterdam)\b/],
];

export function countriesIn(text) {
  return COUNTRIES.filter(([, , re]) => re.test(text)).map(([code]) => code);
}
export const countryName = (code) => COUNTRIES.find((c) => c[0] === code)?.[1] || code.toUpperCase();
export const flagUrl = (code) => `https://flagcdn.com/w320/${code}.png`;
