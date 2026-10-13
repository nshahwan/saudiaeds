// Print color runs down a pixel column of a PNG: node rowcolors.mjs <png> [x] [minRun]
import { readFileSync } from 'fs';
import { PNG } from 'pngjs';
const [f, xs = '10', mr = '6'] = process.argv.slice(2);
const p = PNG.sync.read(readFileSync(f)); const x = +xs;
let prev = null; let start = 0;
const flush = (y) => { if (prev && y - start >= +mr) console.log(`${start}-${y - 1} (${y - start}px) rgb(${prev})`); };
for (let y = 0; y < p.height; y += 1) { const i = (y * p.width + x) * 4; const c = `${p.data[i]},${p.data[i + 1]},${p.data[i + 2]}`; if (c !== prev) { flush(y); prev = c; start = y; } }
flush(p.height);
