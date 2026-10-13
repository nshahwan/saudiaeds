// Download the Saudia media (/-/media/...) referenced by captured pages into stardust/migrate/media/
// and record url-path -> local file in media-map.json (idempotent; /-/media/ is not challenge-gated).
// node fetch-media.mjs <capture.json|renditions.json>...   (captures from captures-full/ or captures/)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join, basename } from 'path';

const HERE = new URL('.', import.meta.url).pathname;
const OUT = join(HERE, 'media');
const MAP = join(HERE, 'media-map.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/svg+xml': 'svg', 'image/webp': 'webp', 'image/gif': 'gif' };
mkdirSync(OUT, { recursive: true });
const map = existsSync(MAP) ? JSON.parse(readFileSync(MAP, 'utf8')) : {};

// relative `-/media/...` srcs (no leading slash) resolve from the site root
const key = (u) => u.replace(/&amp;/g, '&').split('?')[0].replace(/^https?:\/\/www\.saudia\.com/i, '').replace(/^(?!\/)/, '/');
const urls = new Set();
for (const f of process.argv.slice(2)) {
  const cap = JSON.parse(readFileSync(f, 'utf8'));
  // a rendition list ({ path: [src, alt, …] }, e.g. legacy-mobile-banner.json) instead of a capture
  if (!('html' in cap)) {
    Object.values(cap).forEach((v) => { if (Array.isArray(v) && v[0]) urls.add(v[0].replace(/&amp;/g, '&')); });
    continue;
  }
  const html = cap.html || '';
  for (const m of html.matchAll(/(?:src|data-bg)="((?:[^"]*\/)?-\/media\/[^"]+)"/g)) urls.add(m[1].replace(/&amp;/g, '&'));
  for (const extra of cap.extraMedia || []) urls.add(extra);
}

let fetched = 0;
for (const u of urls) {
  const k = key(u);
  if (map[k]) continue;
  const abs = u.startsWith('http') ? u : `https://www.saudia.com${u.startsWith('/') ? '' : '/'}${u}`;
  const r = await fetch(abs, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' } });
  if (!r.ok) { console.error(`FAIL ${r.status} ${k}`); continue; }
  const ct = (r.headers.get('content-type') || '').split(';')[0].trim();
  const buf = Buffer.from(await r.arrayBuffer());
  const base = basename(k).replace(/\.ashx$/i, '').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 60);
  const name = `${base}-${createHash('sha1').update(k).digest('hex').slice(0, 6)}.${EXT[ct] || 'jpg'}`;
  writeFileSync(join(OUT, name), buf);
  map[k] = `/stardust/migrate/media/${name}`;
  fetched += 1;
}
writeFileSync(MAP, JSON.stringify(map, null, 1));
console.log(JSON.stringify({ referenced: urls.size, fetched, mapped: Object.keys(map).length }));
