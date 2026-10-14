// Turns dist/index.html into a page body for hosts that supply their own <html>/<head> skeleton
// (e.g. a claude.ai Artifact): title and meta first, then styles and the inlined app.
import { readFile, writeFile } from 'node:fs/promises';
const html = await readFile('dist/index.html', 'utf8');
const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
const pick = (re) => (head.match(re) || []).join('\n');
const out = [
  pick(/<title>[\s\S]*?<\/title>/),
  pick(/<meta name="claude:[^>]*>/g),
  pick(/<link [^>]*fonts\.g[^>]*>/g),
  pick(/<style[\s\S]*?<\/style>/g),
  body,
  pick(/<script[\s\S]*?<\/script>/g),
].join('\n');
await writeFile(process.argv[2] || 'dist/artifact.html', out);
console.log('artifact page written', out.length, 'bytes');
