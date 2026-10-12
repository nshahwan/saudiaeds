// Harvest stylesheets, fonts and media referenced by the live captures into
// stardust/current/assets/, writing a url -> local-file map (asset-map.json).
// Saudia's /dist/ and /-/media/ assets are not challenge-gated (only pages are).
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';

const ROOT = process.argv[2];
const GATES = join(ROOT, 'stardust/replica/gates');
const OUT = join(ROOT, 'stardust/current/assets');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/svg+xml': 'svg', 'image/webp': 'webp', 'image/gif': 'gif', 'font/woff2': 'woff2', 'application/font-woff2': 'woff2', 'text/css': 'css' };

const urls = new Set();
const pullUrls = (s) => { for (const m of (s || '').matchAll(/url\("?([^")]+)"?\)/g)) if (/^https?:/.test(m[1])) urls.add(m[1]); };
for (const d of readdirSync(GATES)) {
  const f = join(GATES, d, 'live-capture/styles.json');
  if (!existsSync(f)) continue;
  const j = JSON.parse(readFileSync(f, 'utf8'));
  for (const el of j.elements) {
    if (el.src && /^https?:/.test(el.src)) urls.add(el.src);
    pullUrls(el.s['background-image']);
    if (el.before) pullUrls(el.before.bgi);
    if (el.after) pullUrls(el.after.bgi);
  }
  for (const s of j.sheets) if (s.includes('saudia.com')) urls.add(s);
}

const map = existsSync(join(OUT, 'asset-map.json')) ? JSON.parse(readFileSync(join(OUT, 'asset-map.json'), 'utf8')) : {};
const fetchOne = async (u) => {
  if (map[u]) return map[u];
  const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: '*/*' } });
  if (!r.ok) { console.error(`FAIL ${r.status} ${u}`); return null; }
  const ct = (r.headers.get('content-type') || '').split(';')[0].trim();
  const buf = Buffer.from(await r.arrayBuffer());
  const base = (new URL(u).pathname.split('/').pop() || 'asset').replace(/\.(ashx|css|woff2)$/i, '').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 60);
  const ext = EXT[ct] || (u.match(/\.(woff2|css|svg|png|jpe?g)(\?|$)/i) || [])[1] || 'bin';
  const sub = ext === 'css' ? 'css' : ext === 'woff2' ? 'fonts' : 'media';
  const name = `${base}-${createHash('sha1').update(u).digest('hex').slice(0, 6)}.${ext}`;
  mkdirSync(join(OUT, sub), { recursive: true });
  writeFileSync(join(OUT, sub, name), buf);
  map[u] = { file: `${sub}/${name}`, type: ct, bytes: buf.length };
  if (ext === 'css') { // follow font/image urls inside harvested stylesheets
    for (const m of buf.toString('utf8').matchAll(/url\(["']?([^"')]+\.(?:woff2|svg|png|jpg))["']?\)/gi)) {
      const abs = new URL(m[1], u).href;
      if (abs.includes('saudia.com')) urls.add(abs);
    }
  }
  return map[u];
};

let done = 0;
for (let pass = 0; pass < 2; pass += 1) {
  for (const u of [...urls]) { if (await fetchOne(u)) done += 1; }
}
writeFileSync(join(OUT, 'asset-map.json'), JSON.stringify(map, null, 2));
const by = {};
for (const v of Object.values(map)) by[v.file.split('/')[0]] = (by[v.file.split('/')[0]] || 0) + 1;
console.log(JSON.stringify({ urls: urls.size, mapped: Object.keys(map).length, by }));
