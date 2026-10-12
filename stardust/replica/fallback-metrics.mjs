import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('http://127.0.0.1:8791/explore-destination-proposed.html', { waitUntil: 'load' });
const r = await p.evaluate(async () => {
  await document.fonts.ready;
  const c = document.createElement('canvas').getContext('2d');
  const t = 'Planning your trip to this vibrant city is a breeze with Saudia Airlines. Book your flight to Athens today! 0123456789';
  const m = (f) => { c.font = f; const x = c.measureText(t); return { w: x.width, asc: x.fontBoundingBoxAscent, desc: x.fontBoundingBoxDescent }; };
  return { saudia: m('400 100px "Saudia Sans"'), arial: m('400 100px Arial'), saudia600: m('600 100px "Saudia Sans"'), arialB: m('700 100px Arial') };
});
const sa = r.saudia.w / r.arial.w;
console.log(JSON.stringify(r));
console.log(`size-adjust:${(sa * 100).toFixed(2)}% ascent-override:${(r.saudia.asc / sa).toFixed(2)}% descent-override:${(r.saudia.desc / sa).toFixed(2)}% | bold ratio ${(r.saudia600.w / r.arialB.w * 100).toFixed(2)}%`);
await b.close();
