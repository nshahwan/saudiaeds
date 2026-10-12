// Stitch the live-side viewport chunks written by live-capture.js into one PNG,
// using the same row-copy logic as stitch-shot.mjs (chunk y = actual scrollY).
// Usage: node stitch-chunks.mjs <capture-dir> <out.png>
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { PNG } from 'pngjs';

const [dir, out] = process.argv.slice(2);
if (!dir || !out) { console.error('usage: stitch-chunks.mjs <capture-dir> <out.png>'); process.exit(1); }
const meta = JSON.parse(readFileSync(`${dir}/meta.json`, 'utf8'));
const { width, totalH, chunks } = meta;
const outPng = new PNG({ width, height: totalH });
for (const { y, file } of chunks) {
  const img = PNG.sync.read(readFileSync(file));
  if (img.width !== width) throw new Error(`${file}: width ${img.width} != ${width} (DPR/viewport mismatch)`);
  for (let row = 0; row < img.height; row += 1) {
    const destY = y + row;
    if (destY >= totalH) break;
    img.data.copy(outPng.data, destY * width * 4, row * img.width * 4, (row * img.width + width) * 4);
  }
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(outPng));
console.log(`stitched ${out}: ${width}x${totalH} from ${chunks.length} chunks`);
