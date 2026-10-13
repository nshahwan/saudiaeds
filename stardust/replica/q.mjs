// Query a live capture's computed-style dump.
// node q.mjs <slug-width> [--y a-b] [--text re] [--path re] [--keys k1,k2|all] [--tag t]
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const cap = args.shift();
const opt = {};
for (let i = 0; i < args.length; i += 2) opt[args[i].replace(/^--/, '')] = args[i + 1];
const j = JSON.parse(readFileSync(`${new URL('.', import.meta.url).pathname}gates/${cap}/live-capture/styles.json`, 'utf8'));
const DEF = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'background-color', 'padding', 'margin', 'border-radius'];
const keys = opt.keys === 'all' ? null : (opt.keys ? opt.keys.split(',') : DEF);
const [y0, y1] = opt.y ? opt.y.split('-').map(Number) : [-1e9, 1e9];
const tre = opt.text ? new RegExp(opt.text, 'i') : null;
const pre = opt.path ? new RegExp(opt.path, 'i') : null;
const SKIP = { 'font-weight': '400', 'letter-spacing': 'normal', 'background-color': 'rgba(0, 0, 0, 0)', padding: '0px', margin: '0px', 'border-radius': '0px', 'background-image': 'none', 'box-shadow': 'none', transform: 'none', filter: 'none', opacity: '1' };
for (const el of j.elements) {
  if (el.y < y0 || el.y > y1) continue;
  if (tre && !tre.test(el.text || '') && !tre.test(el.alt || '')) continue;
  if (pre && !pre.test(el.path)) continue;
  if (opt.tag && el.tag !== opt.tag) continue;
  if (opt.lean) {
    const painted = el.s['background-color'] !== 'rgba(0, 0, 0, 0)' || el.s['background-image'] !== 'none' || !/^0px/.test(el.s['border-top']) || !/^0px/.test(el.s['border-bottom']) || el.s['box-shadow'] !== 'none';
    if (!el.text && !el.src && !painted && !['img', 'svg', 'input', 'button'].includes(el.tag)) continue;
  }
  if (opt.brief) {
    const st = el.s;
    const ff = st['font-family'].includes('Material') ? 'MI' : st['font-family'].includes('Saudia') ? '' : st['font-family'].split(',')[0];
    const extra = [st['background-color'] !== 'rgba(0, 0, 0, 0)' ? `bg:${st['background-color']}` : '', st['border-radius'] !== '0px' ? `r:${st['border-radius']}` : '', st['box-shadow'] !== 'none' ? 'shadow' : '', !/^0px/.test(st['border-top']) ? `bt:${st['border-top']}` : '', !/^0px/.test(st['border-bottom']) ? `bb:${st['border-bottom']}` : '', st.padding !== '0px' ? `p:${st.padding}` : '', st['text-transform'] !== 'none' ? st['text-transform'] : ''].filter(Boolean).join(' ');
    const what = el.text ? `"${el.text.slice(0, 50)}"` : el.src ? `img:${el.src.split('/').pop().split('?')[0].slice(0, 36)}` : `<${el.tag}>`;
    console.log(`${el.x},${el.y} ${el.w}x${el.h} ${what} ${el.text ? `${ff}${st['font-size']}/${st['font-weight']}/${st['line-height']}${st['letter-spacing'] !== 'normal' ? `/ls${st['letter-spacing']}` : ''} ${st.color.replace('rgba(0, 0, 0, ', 'k(').replace('rgb(', '(')}` : ''} ${extra}`);
    continue;
  }
  const s = Object.entries(el.s).filter(([k, v]) => (!keys || keys.includes(k)) && SKIP[k] !== v).map(([k, v]) => `${k}:${v}`).join('; ');
  const last = el.path.split(' > ').slice(-2).join(' > ');
  console.log(`[${el.x},${el.y} ${el.w}x${el.h}] ${last}${el.text ? ` "${el.text.slice(0, 60)}"` : ''}${el.src ? ` src=${el.src.split('/').pop().slice(0, 40)}` : ''}${el.href ? ` href=${el.href.slice(0, 50)}` : ''}\n    ${s}${el.before ? `\n    ::before ${JSON.stringify(el.before)}` : ''}${el.after ? `\n    ::after ${JSON.stringify(el.after)}` : ''}`);
}
