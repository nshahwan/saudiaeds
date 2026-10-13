// Write stardust/current/pages/home.json from the interactive-session captures of
// https://www.saudia.com/en-SA (content verbatim from the script-free snapshots on 127.0.0.1:8792;
// desktop and mobile image renditions paired by slot).
import { writeFileSync, readFileSync } from 'fs';
import { chromium } from 'playwright';

const ROOT = '/backups/nshahwan/saudiaeds/repo/stardust';
const map = JSON.parse(readFileSync(`${ROOT}/current/assets/asset-map.json`, 'utf8'));
const local = (u) => {
  if (!u) return null;
  const hit = Object.entries(map).find(([k]) => k.split('?')[0] === u.split('?')[0]);
  return hit ? `assets/${hit[1].file}` : u;
};

const extract = () => {
  const t = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
  const main = document.querySelector('.main sc-placeholder');
  const cols = [...main.children];
  const by = (h) => cols.find((c) => [...c.querySelectorAll('h1,h2')].some((x) => t(x).startsWith(h)));
  const img = (root) => [...root.querySelectorAll('img')].map((i) => ({ src: i.currentSrc || i.src, alt: i.alt, cls: i.parentElement.className }));
  const slides = [...document.querySelectorAll('.swiper-slide')].filter((s) => s.querySelector('h1'))
    .map((s) => ({ title: t(s.querySelector('h1')), desc: t(s.querySelector('.swiper-slide__desc')), cta: t(s.querySelector('.swiper-slide__button a')), href: s.querySelector('.swiper-slide__button a')?.getAttribute('href'), imgs: img(s), idx: s.getAttribute('data-swiper-slide-index') }));
  const fares = by('Best fares from');
  const offers = by('Exclusive Offers');
  const banner = (h) => { const c = by(h); return c && { title: t(c.querySelector('h2')), desc: t(c.querySelector('h2 + p, h2 ~ p, .desc, .text p')), cta: t(c.querySelector('a')), href: c.querySelector('a')?.getAttribute('href'), imgs: img(c) }; };
  const news = by('Exceptional experiences');
  const booking = document.querySelector('.booking');
  return {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content,
    slides,
    booking: booking && {
      tabs: [...booking.querySelectorAll('.mat-tab-label')].map(t),
      links: [...booking.querySelectorAll('.ancillary-links a')].map((a) => ({ text: t(a), href: a.getAttribute('href'), target: a.getAttribute('target') })),
      trips: [...booking.querySelectorAll('.mat-radio-label-content')].map(t),
      info: t(booking.querySelector('.covid-update-box p')),
      infoLink: booking.querySelector('.covid-update-box a')?.getAttribute('href'),
    },
    fares: fares && {
      heading: t(fares.querySelector('h2')),
      note: t(fares.querySelector('h2 ~ p, .fares-note, p')),
      all: [...fares.querySelectorAll('a')].filter((a) => /Explore all/.test(t(a))).map((a) => ({ text: t(a), href: a.getAttribute('href') }))[0],
      cards: [...fares.querySelectorAll('li')].map((li) => ({ city: t(li.querySelector('h3')), price: t(li.querySelectorAll('h3')[1]), note: t(li.querySelector('p')), href: li.querySelector('a')?.getAttribute('href'), imgs: img(li) })),
    },
    offers: offers && {
      heading: t(offers.querySelector('h2')),
      all: [...offers.querySelectorAll('a')].filter((a) => /Explore all/.test(t(a))).map((a) => ({ text: t(a), href: a.getAttribute('href') }))[0],
      tiles: [...offers.querySelectorAll('.offer-col, .offer-section')].filter((c) => c.querySelector('h3') && !c.querySelector('.offer-col'))
        .map((c) => ({ title: t(c.querySelector('h3')), desc: t(c.querySelector('h3 + p, p')), href: c.querySelector('a')?.getAttribute('href') || c.closest('a')?.getAttribute('href'), imgs: img(c) })),
    },
    banners: ['Flight + Hotel Deals', 'Shop with Miles', 'Be first to know', 'The best that Saudi Arabia'].map(banner),
    news: news && {
      heading: t(news.querySelector('h2')),
      intro: t(news.querySelector('h2 + p, h2 ~ p')),
      items: [...news.querySelectorAll('li, .swiper-slide')].filter((li) => li.querySelector('h3'))
        .map((li) => ({ title: t(li.querySelector('h3')), text: t(li.querySelector('h3 ~ p, p')), cta: t(li.querySelector('a')), href: li.querySelector('a')?.getAttribute('href'), imgs: img(li) })),
    },
    payments: [...document.querySelectorAll('.saudia-payments-logo')].map((i) => ({ src: i.currentSrc || i.src, alt: i.alt })),
  };
};

const b = await chromium.launch();
const out = {};
for (const w of [1440, 360]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await p.goto(`http://127.0.0.1:8792/home-${w}/live-snapshot.html`, { waitUntil: 'domcontentloaded' });
  out[w] = await p.evaluate(extract);
}
await b.close();
const fix = (o) => JSON.parse(JSON.stringify(o), (k, v) => (k === 'src' ? local(v) : v));
const page = { slug: 'home', url: 'https://www.saudia.com/en-SA', meta: { title: out[1440].title, description: out[1440].description }, desktop: fix(out[1440]), mobile: fix(out[360]) };
writeFileSync(`${ROOT}/current/pages/home.json`, JSON.stringify(page, null, 2));
console.log(JSON.stringify(page.desktop, null, 1).slice(0, 9000));
