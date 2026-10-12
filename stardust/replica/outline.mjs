// Verbatim content outline of a live snapshot: tags + text + hrefs/alts, Angular noise stripped.
// node outline.mjs <snapshot-url> <selector> [maxDepth]
import { chromium } from 'playwright';

const [url, sel = '.main', depth = '40'] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
await p.goto(url, { waitUntil: 'domcontentloaded' });
const out = await p.evaluate(([s, maxD]) => {
  const keep = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'ul', 'ol', 'a', 'strong', 'b', 'em', 'img', 'button', 'span', 'table', 'tr', 'td', 'th', 'br']);
  const lines = [];
  const walk = (el, d) => {
    if (d > maxD) return;
    const cs = el.getAttribute && el.getAttribute('style');
    if (/display:\s*none/.test(cs || '')) return;
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' '); if (t.trim()) lines.push(`${'  '.repeat(d)}"${t}"`); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName.toLowerCase();
      if (['style', 'script', 'svg', 'mat-icon'].includes(tag)) { if (tag === 'mat-icon') lines.push(`${'  '.repeat(d)}[icon ${n.textContent.trim()}]`); continue; }
      if (keep.has(tag)) {
        const attrs = [n.getAttribute('href') ? `href=${n.getAttribute('href')}` : '', tag === 'img' ? `src=${(n.getAttribute('src') || '').split('/').pop().split('?')[0]} alt="${n.getAttribute('alt') || ''}"` : '', /material/.test(n.className) ? 'ICON' : ''].filter(Boolean).join(' ');
        lines.push(`${'  '.repeat(d)}<${tag}${attrs ? ' ' + attrs : ''}>`);
        walk(n, d + 1);
      } else walk(n, d);
    }
  };
  const root = document.querySelector(s);
  if (!root) return `no ${s}`;
  walk(root, 0);
  return lines.join('\n');
}, [sel, Number(depth)]);
console.log(out);
await b.close();
