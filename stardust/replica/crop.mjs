// node crop.mjs <in.png> <y0> <y1> <out.png> [x0] [x1]
import { readFileSync, writeFileSync } from 'fs';
import { PNG } from 'pngjs';
const [f, a, b, out, xa = '0', xb] = process.argv.slice(2);
const p = PNG.sync.read(readFileSync(f));
const y0 = +a; const y1 = Math.min(+b, p.height); const x0 = +xa; const x1 = Math.min(xb ? +xb : p.width, p.width);
const o = new PNG({ width: x1 - x0, height: y1 - y0 });
for (let y = y0; y < y1; y += 1) p.data.copy(o.data, (y - y0) * o.width * 4, (y * p.width + x0) * 4, (y * p.width + x1) * 4);
writeFileSync(out, PNG.sync.write(o));
