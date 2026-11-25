/**
 * Folder listings shared by blocks/cards and blocks/stories-folder (the cards-folder pattern of
 * waringme/eds-reusable-blocks): the pages of a folder picked by the author, from the query
 * index on the published site and from the folder's child pages on AEM author (Universal Editor).
 *
 * folderPages(settings) — settings: () => { indexPath, siteRoot, authorRoot } (scripts.js):
 *   indexPath   the query index (default /query-index.json)
 *   siteRoot    AEM prefix removed from folder selections
 *   authorRoot  AEM author API root; '' forces published behaviour; unset: detected from a
 *               /content/<site>/ page path
 * returns { authorRoot, sitePath, usable, picture, withoutSiteName, list }
 *   list(folder, { limit, order: 'latest' | 'card-order', category, deep }) → entries
 *     { path, href, title, heading, description, image, mobileImage, cardTitle, cardSummary,
 *       cardLinkText, cardOrder, category, lastModified }
 * Direct child pages only, unless a category (any depth, any case, landing pages included) or
 * deep (sub-folder pages, without the pages that are parents of others). The index is read up to
 * 2000 entries, author up to 500 pages; /nav, /footer, /fragments and the current page are left
 * out. Entries missing a title, summary or image are completed from the page itself (failures are
 * logged, the listing data kept). Card order: lowest first, 0 included, missing = 999, ties by
 * title; otherwise latest first (cut to the limit before reading the pages).
 */
const INDEX_LIMIT = '2000';
const AUTHOR_LIMIT = '500';

const normalise = (path) => path.replace(/\.html$/, '').replace(/\/$/, '') || '/';

/** page titles carry the site name ("Saudia | …" or "… - Saudia"): drop it */
const withoutSiteName = (title = '') => title.replace(/^Saudia\s*[|–-]\s*/i, '')
  .replace(/\s[|–-]\s[^|–-]+$/, '').trim();

const orderValue = (value) => (value !== undefined && value !== null && value !== ''
  && Number.isFinite(Number(value)) ? Number(value) : 999);
const label = (e) => String(e.cardTitle || e.heading || e.title);
const byOrder = (a, b) => orderValue(a.cardOrder) - orderValue(b.cardOrder)
  || label(a).localeCompare(label(b));
const byLatest = (a, b) => (Number(b.lastModified) || 0) - (Number(a.lastModified) || 0);

/** pages that are not themselves folders of other listed pages */
const leaves = (pages) => pages
  .filter((e) => !pages.some((o) => o.path.startsWith(`${normalise(e.path)}/`)));

/** chrome documents are never listed: /nav, /footer, /fragments (also under a language root) */
const isChrome = (path) => /^\/([a-z]{2}(-[a-z]{2})?\/)?(nav|footer|fragments)(\/|$|-)/.test(path);

function authorEntry(path, c) {
  return {
    path,
    href: `${path}.html`,
    title: c['jcr:title'] || path.split('/').pop(),
    description: c['jcr:description'],
    image: c.image,
    mobileImage: c['story-mobile-image'],
    cardTitle: c['card-title'] || c['story-title'],
    cardSummary: c['card-summary'] || c['story-summary'],
    cardLinkText: c['card-link-text'] || c['story-link-text'],
    cardOrder: c['card-order'] ?? c['story-order'],
    category: c.category,
    lastModified: Date.parse(c['cq:lastModified'] || '') / 1000 || 0,
  };
}

export default function folderPages(settings) {
  /** AEM author (Universal Editor): pages are addressed as /content/<site>/… */
  const authorRoot = () => settings().authorRoot
    ?? (window.location.pathname.match(/^\/content\/(?!dam\/)[^/.]+/) || [])[0];

  /** the site path of an authored link or path: drops the site root and .html */
  function sitePath(raw) {
    const path = normalise(new URL(raw, window.location.href).pathname);
    const root = settings().siteRoot?.replace(/\/$/, '');
    if (root && (path === root || path.startsWith(`${root}/`))) return path.slice(root.length) || '/';
    const m = path.match(/^\/content\/(?!dam\/)[^/]+(\/.*)?$/);
    return m ? m[1] || '/' : path;
  }

  /**
   * an image URL this page can show: not a broken reference, and on AEM author not an Edge
   * Delivery media URL (./media_… only exists on the published site; author serves the DAM)
   */
  const usable = (src) => Boolean(src) && !src.startsWith('about:')
    && !/\/default-meta-image\.(png|jpe?g)/.test(src)
    && !(authorRoot() && /\/media_[0-9a-f]+\./.test(src));

  /**
   * a decorative <picture> for a listed page; Edge Delivery media get the usual optimised
   * renditions; an image that fails to load removes its closest `slot` element
   */
  function picture(src, slot) {
    const url = new URL(src, window.location.href);
    const pic = document.createElement('picture');
    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    if (url.origin === window.location.origin && /\/media_/.test(url.pathname)) {
      const source = document.createElement('source');
      source.type = 'image/webp';
      source.srcset = `${url.pathname}?width=750&format=webply&optimize=medium`;
      pic.append(source);
      const format = url.pathname.endsWith('.png') ? 'png' : 'jpg';
      img.src = `${url.pathname}?width=750&format=${format}&optimize=medium`;
    } else {
      img.src = url.href;
    }
    img.addEventListener('error', () => pic.closest(slot)?.remove(), { once: true });
    pic.append(img);
    return pic;
  }

  /** published pages answer on their path, the local preview serves them under /content */
  async function fetchPage(href) {
    const { pathname } = new URL(href, window.location.href);
    const local = !authorRoot() && window.location.pathname.startsWith('/content/')
      && !pathname.startsWith('/content/');
    const resp = await fetch(href).catch(() => null);
    if (resp?.ok || !local) return resp;
    return fetch(`/content${pathname}`).catch(() => null);
  }

  /**
   * what a page offers as a card: its card properties and description (head meta), its first
   * heading, and its images (Image / Card mobile image properties, else its article or hero image)
   */
  async function readPage(href) {
    const resp = await fetchPage(href);
    if (!resp?.ok) return null;
    const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
    const base = new URL(resp.url, window.location.origin);
    // keep the query: author image URLs can carry rendition parameters
    const local = (src) => {
      const u = new URL(src, base);
      return u.origin === window.location.origin ? `${u.pathname}${u.search}` : u.href;
    };
    const meta = (name) => doc.head.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
      ?.getAttribute('content')?.trim();
    const main = doc.querySelector('main') || doc.body;
    const images = (selector) => [...main.querySelectorAll(selector)]
      .filter((img) => usable(img.getAttribute('src')));
    const [hero, heroMobile] = images('.hero img');
    const all = images('img');
    // many press releases share a generic hero banner: the article's own image comes first
    const pick = all.find((img) => !img.closest('.hero')) || hero;
    const pathOf = (src) => new URL(src, base).pathname;
    // published: og:image is the page's Image property, else its first image (not a choice);
    // author pages fill og:image with a site default
    const shareImage = usable(meta('og:image')) ? local(meta('og:image')) : '';
    const chosen = !authorRoot() && shareImage
      && (!all[0] || pathOf(shareImage) !== pathOf(all[0].getAttribute('src'))) ? shareImage : '';
    const pageImage = pick ? local(pick.getAttribute('src')) : '';
    const mobileMeta = meta('story-mobile-image');
    return {
      heading: main.querySelector('h1, h2')?.textContent.trim(),
      description: meta('description'),
      // Card page properties (the cards-folder convention); Story ones from before as fallback
      cardTitle: meta('card-title') || meta('story-title'),
      cardSummary: meta('card-summary') || meta('story-summary'),
      cardLinkText: meta('card-link-text') || meta('story-link-text'),
      cardOrder: meta('card-order') ?? meta('story-order'),
      image: chosen || pageImage || shareImage,
      // the hero's mobile rendition only goes with the hero
      mobileImage: (usable(mobileMeta) && local(mobileMeta))
        || (!chosen && pick === hero && heroMobile ? local(heroMobile.getAttribute('src')) : ''),
    };
  }

  /** fill what the listing lacks from the page itself; complete entries need no request */
  async function summarise(entry) {
    const complete = (entry.cardTitle || entry.heading || entry.title)
      && (entry.cardSummary || entry.description) && usable(entry.image);
    if (complete) return entry;
    const out = {
      ...entry,
      image: usable(entry.image) ? entry.image : '',
      mobileImage: usable(entry.mobileImage) ? entry.mobileImage : '',
    };
    try {
      const page = await readPage(entry.href || entry.path);
      if (!page) throw new Error(`could not load page ${entry.href || entry.path}`);
      const indexed = out.image;
      ['cardTitle', 'cardSummary', 'cardLinkText', 'heading', 'description', 'image', 'mobileImage']
        .forEach((key) => { out[key] ||= page[key]; });
      if (out.cardOrder === undefined || out.cardOrder === null || out.cardOrder === '') {
        out.cardOrder = page.cardOrder;
      }
      // the page's mobile image only goes with its own desktop image
      if (indexed) out.mobileImage = entry.mobileImage || '';
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('folder listing: could not supplement page metadata', entry.path, error);
    }
    return out;
  }

  /** published site: the folder's pages from the query index */
  async function fromIndex(folder, {
    limit, order, category, deep,
  }) {
    const index = new URL(settings().indexPath || '/query-index.json', window.location.origin);
    index.searchParams.set('limit', INDEX_LIMIT);
    const resp = await fetch(index.href);
    if (!resp.ok) throw new Error(`${resp.status} loading query index`);
    const { data } = await resp.json();
    if (!Array.isArray(data)) throw new Error('Query index must contain a data array');
    const canonical = document.querySelector('link[rel="canonical"]');
    const here = normalise(canonical ? new URL(canonical.href).pathname : window.location.pathname);
    const prefix = folder === '/' ? '/' : `${folder}/`;
    let pages = data.filter((e) => e.path && e.path.startsWith(prefix) && e.path !== prefix
      && (category || deep || !normalise(e.path).slice(prefix.length).includes('/'))
      && (!category || (e.category || '').toLowerCase() === category)
      && !isChrome(e.path));
    if (deep) pages = leaves(pages);
    pages = pages.filter((e) => normalise(e.path) !== here);
    // latest first can be cut before reading the pages; card order needs all their properties
    if (order === 'latest') pages = pages.sort(byLatest).slice(0, limit);
    const entries = await Promise.all(pages.map(summarise));
    return order === 'latest' ? entries : entries.sort(byOrder).slice(0, limit);
  }

  /** Universal Editor (AEM author): the folder's child pages and their page properties */
  async function fromAuthor(folder, {
    limit, order, category, deep,
  }) {
    const root = `${authorRoot()}${folder === '/' ? '' : folder}`;
    const here = normalise(window.location.pathname);
    let pages;
    if (category || deep) {
      const q = new URLSearchParams({
        path: root, type: 'cq:Page', 'p.limit': AUTHOR_LIMIT, 'p.hits': 'full', 'p.nodedepth': '1',
      });
      if (category) {
        q.set('property', 'jcr:content/category');
        q.set('property.value', category);
      }
      const resp = await fetch(`/bin/querybuilder.json?${q}`);
      if (!resp.ok) throw new Error(`${resp.status} loading author query`);
      const { hits = [] } = await resp.json();
      pages = hits.filter((h) => h['jcr:content'] && h['jcr:path'] !== root)
        .map((h) => authorEntry(h['jcr:path'], h['jcr:content']));
      if (deep) pages = leaves(pages);
    } else {
      const resp = await fetch(`${root}.2.json`);
      if (!resp.ok) throw new Error(`${resp.status} loading author folder`);
      const json = await resp.json();
      pages = Object.entries(json)
        .filter(([, v]) => v && v['jcr:primaryType'] === 'cq:Page' && v['jcr:content'])
        .map(([name, v]) => authorEntry(`${root}/${name}`, v['jcr:content']));
    }
    pages = pages
      .filter((e) => normalise(e.path) !== here)
      .sort(order === 'latest' ? byLatest : byOrder)
      .slice(0, limit);
    return Promise.all(pages.map(summarise));
  }

  /** the folder's pages: from AEM author in the editor, from the query index on the site */
  const list = (folder, options) => (authorRoot()
    ? fromAuthor(folder, options) : fromIndex(folder, options));

  return {
    authorRoot, sitePath, usable, picture, withoutSiteName, list,
  };
}
