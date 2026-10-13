import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto(process.argv[2], { waitUntil: 'load' });
console.log(await p.evaluate(async () => { await document.fonts.ready; const c = document.createElement('canvas').getContext('2d'); const t = 'Discover the treasures recovered from the Acropolis site in this world-class modern museum.'; const m = (f) => { c.font = f; return c.measureText(t).width.toFixed(2); }; return JSON.stringify({ faces: [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`), saudia: m('400 16px "Saudia Sans"'), arial: m('400 16px arial'), sans: m('400 16px sans-serif') }); }));
await b.close();
