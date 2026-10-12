/* global WebImporter */
/**
 * Import script: news — migrates live Saudia press releases in the legacy layout (About us ›
 * press releases; approved replica stardust/prototypes/press-legacy-proposed.html) into
 * /content/saudiaeds/en.
 *
 * Source: live captures staged by stardust/migrate/stage-live.py
 * (http://127.0.0.1:8795/en/about-us/press-releases/…/<name>.html; images already local;
 * <meta name="mobile-hero"> carries the mobile banner rendition, <meta name="body-class"> the
 * live body classes). The live Sitecore components are rebuilt as:
 *   app-jss-image-link-list         → hero (image, mobileImage); variant `campaign` on cms pages
 *   1st app-jss-title-text          → section `news`: h2.UpdateHeading as <h1>, its subtitle
 *                                     <h3> as <h2> (R-10), the rest as default content
 *   app-jss-image (when not empty)  → picture, after the title (or after the body when it
 *                                     follows the body on live)
 *   2nd app-jss-title-text          → section `news-body`: body copy
 * Page metadata: template `news`; theme `legacy-cms` on pages whose live body carries
 * `cms-page` (fixed header, rounded banner, bulleted footer links).
 */
import edsBlockParser from './parsers/eds-block.js';
import edsSectionsTransformer from './transformers/eds-sections.js';

const HOST = 'https://www.saudia.com';
// pages already migrated to /en; press releases of this batch are matched by path below
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
      // trailing line breaks only pad the heading/paragraph box on live
      while (c.lastChild && (c.lastChild.nodeName === 'BR' || (c.lastChild.nodeType === 3 && !c.lastChild.textContent.trim()))) {
        c.lastChild.remove();
      }
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

/** retag a heading, keeping its (cleaned) children */
function retag(document, h, tag) {
  const n = document.createElement(tag);
  n.append(...h.childNodes);
  return n;
}

export default {
  // the importer's pre-clean may drop <head>; park the staged meta on <body> first
  onLoad: async ({ document }) => {
    const m = (n) => document.querySelector(`meta[name="${n}"]`)?.content || '';
    Object.assign(document.body.dataset, {
      title: document.title,
      desc: m('description'),
      migrated: m('migrated'),
      live: m('body-class'),
      mobile: m('mobile-hero'),
      mobileAlt: m('mobile-hero-alt'),
    });
  },

  transform: ({ document, params }) => {
    const main = document.querySelector('main');
    const d = document.body.dataset;
    const cms = /\bcms-page\b/.test(d.live || '');
    const sections = [];
    sections.push(el(document, 'div', {}, el(document, 'div', { class: 'metadata' }, [
      ['Title', d.title || ''], ['Description', d.desc || ''], ['template', 'news'],
      ...(cms ? [['theme', 'legacy-cms']] : []),
    ].map(([k, v]) => el(document, 'div', {}, el(document, 'div', {}, k), el(document, 'div', {}, v))))));

    // components in live order: banner, title, [image], body, [image]
    const comps = [...main.querySelectorAll('app-jss-image-link-list, app-jss-title-text, app-jss-image')];
    const banner = comps.find((c) => c.matches('app-jss-image-link-list'));
    const [titleText, bodyText] = comps.filter((c) => c.matches('app-jss-title-text'));
    const image = comps.find((c) => c.matches('app-jss-image') && c.querySelector('img'));

    if (banner) {
      const img = banner.querySelector('.desktop-view img, img');
      sections.push(el(document, 'div', {}, block(document, cms ? 'hero campaign' : 'hero', [
        [['image', img ? picture(document, img.getAttribute('src'), img.getAttribute('alt')) : null]],
        [['mobileImage', d.mobile ? picture(document, d.mobile, d.mobileAlt) : null]],
        [['text', []]],
      ])));
    }

    const imageNode = () => {
      const i = image.querySelector('.desktop-view img, img');
      return picture(document, i.getAttribute('src'), i.getAttribute('alt'));
    };
    const imageFirst = image && bodyText && comps.indexOf(image) < comps.indexOf(bodyText);

    if (titleText) {
      const h = titleText.querySelector('h2.UpdateHeading, h2, h1');
      // the HTML parser closes p.titleTextSub before block children: read the whole component
      const rest = [...(titleText.querySelector('.title-text') || titleText).childNodes].filter((n) => n !== h);
      const nodes = clean(document, rest).map((n) => (n.tagName === 'H3' ? retag(document, n, 'h2') : n));
      sections.push(el(
        document,
        'div',
        {},
        h ? el(document, 'h1', {}, text(h)) : null,
        nodes,
        imageFirst ? imageNode() : null,
        sectionMeta(document, 'news'),
      ));
    }
    if (bodyText) {
      const body = bodyText.querySelector('.title-text') || bodyText;
      sections.push(el(
        document,
        'div',
        {},
        clean(document, [...body.childNodes]),
        image && !imageFirst ? imageNode() : null,
        sectionMeta(document, 'news-body'),
      ));
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
      report: { title: d.title, source: 'live capture (press release, legacy layout)' },
    }];
  },
};
