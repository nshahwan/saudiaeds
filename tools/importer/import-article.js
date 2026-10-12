/* global WebImporter */
/**
 * Import script: article — migrates live Saudia press releases in the "modern article" layout
 * (About us › press releases; approved replica stardust/prototypes/press-release-proposed.html)
 * into /content/saudiaeds/en.
 *
 * Source: live captures staged by stardust/migrate/stage-live.py
 * (http://127.0.0.1:8795/en/about-us/press-releases/<name>.html; images already local).
 * The live CMS rich text is rebuilt into the approved structure:
 *   .saudia-article-hero      → article-hero (image, meta: location + date, text: h1, subtitle)
 *   .saudia-article-body      → default content (p, lists, headings, images) with every
 *       .saudia-article-quote → quote (quotation, attribution), all in a section styled `article`
 *   .saudia-btn-container a   → "Back to news" secondary button, section styled `article-end`
 * then the shared eds-block parser / eds-sections transformer emit the authoring tables.
 */
import edsBlockParser from './parsers/eds-block.js';
import edsSectionsTransformer from './transformers/eds-sections.js';

const HOST = 'https://www.saudia.com';
// pages already migrated to /en (destinations, product, listing, home); press releases of this
// batch are matched by path below, so links between releases stay on the new site
const MIGRATED = new Set([
  '/en', '/en/explore/saudia-new-destinations-2026/fly-to-athens', '/en/book-and-manage/book/flight-pass',
  '/en/plan/on-board/classes-of-travel',
]);
const RELEASE = /^\/en\/about-us\/press-releases\/(20\d\d\/\d\d\/)?press-release-[\w-]+$/;
const text = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : '');

function href(u, document) {
  if (!u || /^(mailto:|tel:|#)/i.test(u)) return u;
  const abs = /^https?:/i.test(u) ? u : `${HOST}${u.startsWith('/') ? '' : '/'}${u}`;
  const url = new URL(abs);
  if (!/(^|\.)saudia\.com$/i.test(url.hostname)) return u;
  const path = url.pathname.replace(/\/$/, '');
  const target = path.replace(/^\/en(-sa)?(?=\/|$)/i, '/en').toLowerCase();
  const local = document.body.dataset.migrated.split(' ');
  if (MIGRATED.has(target) || (RELEASE.test(target) && local.includes(target))) {
    return target + url.search + url.hash;
  }
  return abs;
}

function el(document, tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => { if (v != null) e.setAttribute(k, v); });
  e.append(...kids.flat().filter((k) => k != null));
  return e;
}

/** EDS block markup: div.<name> > row div > cell div[data-xwalk-field] (eds-block emits hints) */
function block(document, name, rows) {
  return el(document, 'div', { class: name }, rows.map((row) => el(document, 'div', {}, row.map(([field, nodes]) => {
    const cell = el(document, 'div', {}, nodes);
    if (field) cell.dataset.xwalkField = field;
    return cell;
  }))));
}

function sectionMeta(document, style) {
  return el(document, 'div', { class: 'section-metadata' }, el(document, 'div', {}, el(document, 'div', {}, 'style'), el(document, 'div', {}, style)));
}

function picture(document, src, alt) {
  return el(document, 'p', {}, el(document, 'picture', {}, el(document, 'img', { src, alt: alt || '' })));
}

/** Flatten live rich text into clean authorable nodes (p, h2–h6, ul/ol, images) */
function clean(document, nodes) {
  const out = [];
  const walk = (n) => {
    if (n.nodeType === 3) {
      if (n.textContent.trim()) out.push(el(document, 'p', {}, n.textContent.trim()));
      return;
    }
    if (n.nodeType !== 1) return;
    const tag = n.tagName.toLowerCase();
    if (/^(h[1-6]|p|ul|ol)$/.test(tag)) {
      if (tag === 'p' && n.querySelector('h1,h2,h3,h4,h5,h6,p,ul,ol,div,img')) {
        [...n.childNodes].forEach(walk);
        return;
      }
      if (!text(n) && !n.querySelector('img')) return;
      const c = n.cloneNode(true);
      c.querySelectorAll('*').forEach((x) => {
        [...x.attributes].forEach((a) => {
          if (!['href', 'src', 'alt', 'target'].includes(a.name)) x.removeAttribute(a.name);
        });
      });
      [...c.attributes].forEach((a) => c.removeAttribute(a.name));
      c.querySelectorAll('a[href]').forEach((a) => a.setAttribute('href', href(a.getAttribute('href'), document)));
      c.querySelectorAll('span').forEach((s) => s.replaceWith(...s.childNodes));
      out.push(c);
      return;
    }
    if (tag === 'img') {
      out.push(picture(document, n.getAttribute('src'), n.getAttribute('alt')));
      return;
    }
    [...n.childNodes].forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

function hero(document, root) {
  const img = root.querySelector('.saudia-hero-image-wrap img, img');
  // meta items were parked by onLoad (the pre-clean unwraps the live <span>s)
  const box = root.querySelector('.saudia-article-meta');
  const meta = (box && box.dataset.items ? JSON.parse(box.dataset.items) : [])
    .map((t) => el(document, 'p', {}, t));
  const sub = root.querySelector('.saudia-article-subtitle');
  return block(document, 'article-hero', [
    [['image', img ? picture(document, img.getAttribute('src'), img.getAttribute('alt')) : null]],
    [['meta', meta]],
    [['text', [el(document, 'h1', {}, text(root.querySelector('h1'))),
      sub && text(sub) ? el(document, 'p', {}, text(sub)) : null]]],
  ]);
}

function quote(document, q) {
  const cite = q.querySelector('cite');
  const paras = clean(document, [...q.childNodes].filter((n) => n !== cite));
  return block(document, 'quote', [
    [['quotation', paras]],
    [['attribution', cite && text(cite) ? text(cite) : null]],
  ]);
}

export default {
  // the importer's pre-clean may drop <head>; park the staged meta on <body> first
  onLoad: async ({ document }) => {
    const m = (n) => document.querySelector(`meta[name="${n}"]`)?.content || '';
    Object.assign(document.body.dataset, {
      title: document.title, desc: m('description'), migrated: m('migrated'), live: m('body-class'),
    });
    document.querySelectorAll('.saudia-article-meta').forEach((box) => {
      box.dataset.items = JSON.stringify([...box.querySelectorAll('span')].map(text).filter(Boolean));
    });
  },

  transform: ({ document, params }) => {
    const main = document.querySelector('main');
    const d = document.body.dataset;
    const article = main.querySelector('.saudia-modern-article');
    const sections = [];
    sections.push(el(document, 'div', {}, el(document, 'div', { class: 'metadata' }, [
      ['Title', d.title || ''], ['Description', d.desc || ''], ['template', 'article'],
      // live shows the travel notice strip only on pages flagged withTravelNotice
      ...(/\bwithTravelNotice\b/.test(d.live || '') ? [] : [['theme', 'no-notice']]),
    ].map(([k, v]) => el(document, 'div', {}, el(document, 'div', {}, k), el(document, 'div', {}, v))))));

    if (article) {
      const body = article.querySelector('.saudia-article-body');
      const nodes = body ? [...body.childNodes].flatMap((n) => (n.nodeType === 1 && n.matches('.saudia-article-quote')
        ? [quote(document, n)] : clean(document, [n]))) : [];
      sections.push(el(
        document,
        'div',
        {},
        hero(document, article.querySelector('.saudia-article-hero') || article),
        nodes,
        sectionMeta(document, 'article'),
      ));
    }
    const back = main.querySelector('.saudia-btn-container a[href]');
    if (back) {
      sections.push(el(document, 'div', {}, el(document, 'p', {}, el(
        document,
        'em',
        {},
        el(document, 'a', { href: href(back.getAttribute('href'), document) }, text(back)),
      )), sectionMeta(document, 'article-end')));
    }

    main.replaceChildren(...sections);
    main.querySelectorAll(':scope > div > div[class]').forEach((b) => {
      if (!['metadata', 'section-metadata'].includes(b.classList[0])) edsBlockParser(b, { document });
    });
    edsSectionsTransformer(main, document);

    const { pathname } = new URL(params.originalURL);
    return [{
      element: main,
      path: WebImporter.FileUtils.sanitizePath(pathname.replace(/\.html$/, '')),
      report: { title: d.title, source: 'live capture (press release, article layout)' },
    }];
  },
};
