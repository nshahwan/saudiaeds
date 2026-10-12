// Text-matched element parity: live capture (styles.json) vs served prototype.
// Dumps the prototype with the SAME extraction as live-capture.js, pairs elements by
// visible text (in document order), and reports geometry + key style deltas.
// node parity.mjs <slug> <width> <protoUrl> [--all] [--y a-b]
import { readFileSync, writeFileSync } from 'fs';
import { chromium } from 'playwright';

const [slug, w, url, ...rest] = process.argv.slice(2);
const W = Number(w);
const showAll = rest.includes('--all');
const yi = rest.indexOf('--y');
const [y0, y1] = yi >= 0 ? rest[yi + 1].split('-').map(Number) : [-1, 1e9];
const HERE = new URL('.', import.meta.url).pathname;
const live = JSON.parse(readFileSync(`${HERE}gates/${slug}-${W}/live-capture/styles.json`, 'utf8'));

let proto;
if (url.endsWith('.json')) {
  // Symmetric mode: prototype dumped by the SAME browser + routine as live (live-capture.js)
  const pj = JSON.parse(readFileSync(url, 'utf8'));
  proto = { docH: Math.max(...pj.elements.map((e) => e.y + e.h)), out: pj.elements.filter((e) => e.text || e.src).map((e) => ({ ...e, text: (e.text || '').slice(0, 160) })) };
} else {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: 900 } });
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(500);
  proto = await page.evaluate(() => {
    const KEYS = ['font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'font-family'];
    const out = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
      const src = el.tagName === 'IMG' ? (el.currentSrc || el.src) : null;
      if (!text && !src) continue;
      const s = {}; for (const k of KEYS) s[k] = cs.getPropertyValue(k);
      out.push({ tag: el.tagName.toLowerCase(), text: text.slice(0, 160), src, x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), s });
    }
    return { docH: document.documentElement.scrollHeight, out };
  });
  await browser.close();
}

const norm = (t) => (t || '').replace(/[’']/g, "'").toLowerCase();
const imgKey = (s) => (s || '').split('/').pop().split('?')[0].replace(/(-[0-9a-f]{6})?\.(ashx|png|jpe?g|svg)$/i, '').replace(/\.ashx$/i, '').toLowerCase();
const used = new Set();
const rows = [];
for (const L of live.elements) {
  if (!L.text && !L.src) continue;
  if (L.y < y0 || L.y > y1) continue;
  if (L.w <= 1 && L.h <= 1) continue;
  let best = -1;
  for (let i = 0; i < proto.out.length; i += 1) {
    if (used.has(i)) continue;
    const P = proto.out[i];
    if (L.text ? norm(P.text) === norm(L.text) : (P.src && imgKey(P.src) === imgKey(L.src))) { best = i; break; }
  }
  if (best < 0) { rows.push({ L, miss: true }); continue; }
  used.add(best);
  rows.push({ L, P: proto.out[best] });
}
let printed = 0;
const lines = [`proto docH ${proto.docH} vs live ${Math.max(...live.elements.map((e) => e.y + e.h))}`];
for (const { L, P, miss } of rows) {
  const label = (L.text || `img:${imgKey(L.src)}`).slice(0, 44);
  if (miss) { lines.push(`MISS  live ${L.x},${L.y} ${L.w}x${L.h} "${label}"`); continue; }
  const d = { dx: P.x - L.x, dy: P.y - L.y, dw: P.w - L.w, dh: P.h - L.h };
  const sd = ['font-size', 'font-weight', 'line-height', 'letter-spacing', 'color'].filter((k) => L.s[k] !== P.s[k]).map((k) => `${k}:${L.s[k]}→${P.s[k]}`);
  const off = Math.abs(d.dx) > 2 || Math.abs(d.dy) > 2 || Math.abs(d.dw) > 3 || Math.abs(d.dh) > 3 || sd.length;
  if (!off && !showAll) continue;
  printed += 1;
  lines.push(`${String(L.y).padStart(5)} dy${d.dy >= 0 ? '+' : ''}${d.dy} dx${d.dx >= 0 ? '+' : ''}${d.dx} dw${d.dw >= 0 ? '+' : ''}${d.dw} dh${d.dh >= 0 ? '+' : ''}${d.dh}  "${label}" ${sd.join(' ')}`);
}
const extra = proto.out.filter((_, i) => !used.has(i) && proto.out[i].y >= y0 && proto.out[i].y <= y1).map((P) => `EXTRA proto ${P.x},${P.y} "${(P.text || P.src || '').slice(0, 44)}"`);
console.log([...lines, ...extra.slice(0, 15)].join('\n'));
writeFileSync(`${HERE}gates/${slug}-${W}/parity.txt`, [...lines, ...extra].join('\n'));
