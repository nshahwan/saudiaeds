// Write stardust/current/pages/<slug>.json from the interactive-session captures
// (crawl.mjs captured Imperva challenge pages; these replace them). Content is read
// verbatim from the script-free live snapshot DOM served on 127.0.0.1:8792.
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { chromium } from 'playwright';

const ROOT = '/backups/nshahwan/saudiaeds/repo/stardust';
const PAGES = [
  ['explore-destination', 'https://www.saudia.com/en-SA/explore/saudia-new-destinations-2026/fly-to-athens', 'Explore'],
  ['book-manage-flight-pass', 'https://www.saudia.com/en-SA/book-and-manage/book/flight-pass', 'Book & Manage'],
  ['experience-classes', 'https://www.saudia.com/en-SA/experience/on-board/classes-of-travel', 'Experience'],
];
mkdirSync(`${ROOT}/current/pages`, { recursive: true });
const b = await chromium.launch();
for (const [slug, url, section] of PAGES) {
  const meta = JSON.parse(readFileSync(`${ROOT}/replica/gates/${slug}-1440/live-capture/meta.json`, 'utf8'));
  const styles = JSON.parse(readFileSync(`${ROOT}/replica/gates/${slug}-1440/live-capture/styles.json`, 'utf8'));
  const p = await b.newPage();
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await p.goto(`http://127.0.0.1:8792/${slug}-1440/live-snapshot.html`, { waitUntil: 'domcontentloaded' });
  const doc = await p.evaluate(() => {
    const main = document.querySelector('.main');
    const t = (e) => e.textContent.replace(/\s+/g, ' ').trim();
    return {
      headings: [...main.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({ level: Number(h.tagName[1]), text: t(h) })).filter((h) => h.text),
      links: [...main.querySelectorAll('a[href]')].map((a) => ({ text: t(a), href: a.getAttribute('href') })),
      images: [...main.querySelectorAll('img')].map((i) => ({ src: i.getAttribute('src'), alt: i.getAttribute('alt') || '' })),
      metaKeywords: document.querySelector('meta[name="keywords"]')?.content || null,
      canonical: document.querySelector('link[rel="canonical"]')?.href || null,
    };
  });
  await p.close();
  const out = {
    _provenance: {
      writtenBy: 'stardust:replica',
      writtenAt: new Date().toISOString(),
      captureChannel: 'interactive-browser-session (crawl.mjs blocked by Imperva challenge — see current/_invalid-challenge-capture/)',
      source: [`stardust/replica/gates/${slug}-1440/live-capture/`, `stardust/replica/gates/${slug}-360/live-capture/`],
    },
    slug, url, finalUrl: meta.finalUrl, section, title: styles.title, lang: styles.lang, dir: styles.dir,
    meta: { description: styles.metaDesc, keywords: doc.metaKeywords, canonical: doc.canonical },
    fonts: [...new Set(styles.fonts.filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`))],
    headings: doc.headings, links: doc.links, images: doc.images,
    capture: { width1440: { totalH: meta.totalH }, width360: { totalH: JSON.parse(readFileSync(`${ROOT}/replica/gates/${slug}-360/live-capture/meta.json`, 'utf8')).totalH } },
  };
  writeFileSync(`${ROOT}/current/pages/${slug}.json`, JSON.stringify(out, null, 2));
  console.log(slug, doc.headings.length, 'headings', doc.links.length, 'links', doc.images.length, 'images');
}
await b.close();
