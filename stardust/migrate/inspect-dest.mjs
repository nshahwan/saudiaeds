// Inspect a captured destination page's live component markup (hero, booking, rich text, FAQ)
// to design the sibling parsers: node inspect-dest.mjs <slug>
import { readFileSync } from 'fs';
import { chromium } from 'playwright';

const slug = process.argv[2];
const cap = JSON.parse(readFileSync(new URL(`./captures-full/${slug}.json`, import.meta.url), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage();
await p.route('**/*', (r) => (r.request().url().startsWith('data:') || r.request().resourceType() === 'document' ? r.continue() : r.abort()));
await p.setContent(`<html><body><main>${cap.html}</main></body></html>`);
const out = await p.evaluate(() => {
  const t = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
  const tidy = (e) => (e ? e.outerHTML.replace(/\s(?:_ngcontent|_nghost)[^=]*="[^"]*"/g, '').replace(/<!---->/g, '').replace(/\s+/g, ' ') : null);
  const hero = document.querySelector('app-jss-image-link-list');
  const tab = document.querySelector('app-jss-saudia-general-tablayout');
  const text = document.querySelector('app-jss-title-text');
  const faq = document.querySelector('app-jss-faq');
  return {
    heroImgs: hero ? [...hero.querySelectorAll('img')].map((i) => `${i.closest('[class]')?.className} :: ${i.getAttribute('src')?.slice(0, 120)} :: ${i.alt}`) : null,
    heroH: hero ? [...hero.querySelectorAll('h1,h2,p,a')].map((e) => `${e.tagName} ${t(e)?.slice(0, 80)} ${e.getAttribute('href') || ''}`) : null,
    tabs: tab ? [...tab.querySelectorAll('.mat-tab-label, [role=tab]')].map(t) : null,
    links: tab ? [...tab.querySelectorAll('.ancillary-links a')].map((a) => `${t(a)} -> ${a.getAttribute('href')}`) : null,
    radios: tab ? [...tab.querySelectorAll('.mat-radio-label-content')].map(t) : null,
    miles: tab ? t(tab.querySelector('.mat-slide-toggle-content')) : null,
    fields: tab ? [...tab.querySelectorAll('.custom-form-item')].map((f) => `${f.className} :: ${t(f)?.slice(0, 60)} :: ${f.querySelector('input')?.value || ''}`) : null,
    info: tab ? `${t(document.querySelector('.covid-update-box p'))} -> ${document.querySelector('.covid-update-box a')?.getAttribute('href')}` : null,
    textTop: text ? [...text.querySelectorAll('[class]')].map((e) => e.className).filter((c) => /saudia|banner|itiner/.test(c)).slice(0, 12) : null,
    banner: tidy(document.querySelector('.saudia-banner'))?.slice(0, 600),
    faqHead: faq ? t(faq.querySelector('h2,h3')) : null,
    faqItems: faq ? [...faq.querySelectorAll('mat-expansion-panel, .faq__item, [class*=panel]')].slice(0, 2).map((x) => tidy(x).slice(0, 700)) : null,
  };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
