import { readFileSync } from 'fs';
const cap = process.argv[2];
const j = JSON.parse(readFileSync(`/backups/nshahwan/saudiaeds/repo/stardust/replica/gates/${cap}/live-capture/styles.json`, 'utf8'));
for (const el of j.elements) {
  const s = el.s;
  const bgi = s['background-image'] !== 'none' ? s['background-image'].slice(0, 160) : '';
  const bg = s['background-color'] !== 'rgba(0, 0, 0, 0)';
  if ((el.w >= 300 && (bg || bgi)) || el.tag === 'img' && el.w > 100) console.log(`${el.x},${el.y} ${el.w}x${el.h} ${el.tag}${el.src ? ' ' + el.src.split('/').pop().split('?')[0] + ' nat' + el.nat + ' fit:' + s['object-fit'] + ' pos:' + s['object-position'] : ''} ${bg ? 'bg:' + s['background-color'] : ''} ${bgi ? 'bgi:' + bgi + ' sz:' + s['background-size'] + ' pos:' + s['background-position'] : ''} ${s['border-radius'] !== '0px' ? 'r:' + s['border-radius'] : ''} ${s.position !== 'static' ? s.position : ''} z:${s['z-index']}  ${el.path.split(' > ').slice(-1)}`);
}
