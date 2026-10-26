/**
 * stories-folder — the stories list built from a folder of pages (no hand-authored stories),
 * e.g. the latest press releases. Renders with the stories block's design (blocks/stories).
 *
 * Model (xwalk block, _stories-folder.json) — one single-cell row per field, in this order:
 *   folder  the folder to list (link or path; /content/<site> prefix and .html are dropped)
 *   count   how many stories (default 3)
 * Style `story-order` sorts by the Story order page property; otherwise latest first.
 * Each page directly inside the folder becomes a story from its Story title / Story summary /
 * Story link text / Image / Story mobile image properties, falling back to its first heading,
 * description and hero images; the current page is left out. Published pages are read from the
 * query index, in the Universal Editor (AEM author) from the folder's child pages. An unset
 * folder shows a prompt in the editor so the block stays selectable.
 * @ew-exempt all — index-driven listing; the block's only authored content is its config (EW5 c)
 */
import { loadCSS } from '../../scripts/aem.js';
import { storyItem } from '../stories/stories.js';

const INDEX = '/query-index.json';
const LINK_TEXT = 'Learn more';

/**
 * AEM author (Universal Editor): pages are addressed as /content/<site>/… on an AEM host (the
 * local preview also serves /content/… but reads like the published site)
 */
const AUTHOR_ROOT = /\.adobeaemcloud\.(com|net)$/.test(window.location.hostname)
  ? (window.location.pathname.match(/^\/content\/(?!dam\/)[^/.]+/) || [])[0] : undefined;

const normalise = (path) => path.replace(/\.html$/, '').replace(/\/$/, '') || '/';

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

/** the site path of an authored link: drops .html and, on author, the /content/<site> prefix */
function sitePath(raw) {
  const path = normalise(new URL(raw, window.location.href).pathname);
  if (!AUTHOR_ROOT || !path.startsWith(AUTHOR_ROOT)) return path;
  return path.slice(AUTHOR_ROOT.length) || '/';
}

/** the block's field rows, in model order: folder, count */
function readConfig(block) {
  const [folderRow, countRow] = [...block.children];
  const config = {
    folder: null,
    count: 3,
    order: block.classList.contains('story-order') ? 'story-order' : 'latest',
  };
  if (folderRow) {
    const a = folderRow.querySelector('a');
    const raw = a ? a.getAttribute('href') : folderRow.textContent.trim();
    if (raw && raw.startsWith('/')) config.folder = sitePath(raw);
  }
  const count = countRow?.textContent.trim();
  if (/^\d+$/.test(count || '')) config.count = Math.max(1, Number(count));
  return config;
}

/**
 * an image URL this page can show: not a broken reference, and on AEM author not an Edge
 * Delivery media URL (./media_… only exists on the published site; author serves the DAM)
 */
const usable = (src) => Boolean(src) && !src.startsWith('about:')
  && !/\/default-meta-image\.(png|jpe?g)/.test(src)
  && !(AUTHOR_ROOT && /\/media_[0-9a-f]+\./.test(src));

/** <picture> for a story image; Edge Delivery media get the usual optimised renditions */
function storyPicture(src, width) {
  const url = new URL(src, window.location.href);
  const pic = document.createElement('picture');
  const img = document.createElement('img');
  img.alt = '';
  img.loading = 'lazy';
  if (url.origin === window.location.origin && /\/media_/.test(url.pathname)) {
    const source = document.createElement('source');
    source.type = 'image/webp';
    source.srcset = `${url.pathname}?width=${width}&format=webply&optimize=medium`;
    pic.append(source);
    const format = url.pathname.endsWith('.png') ? 'png' : 'jpg';
    img.src = `${url.pathname}?width=${width}&format=${format}&optimize=medium`;
  } else {
    img.src = url.href;
  }
  // an image that still fails to load drops its slot rather than showing a broken icon
  img.addEventListener('error', () => pic.closest('.stories__pic')?.remove(), { once: true });
  pic.append(img);
  return pic;
}

/** page titles carry the site name ("… | Saudia"); the story heading drops it */
function withoutSiteName(title = '') {
  return title.replace(/^Saudia\s*[|–-]\s*|\s*[|–-]\s*Saudia$/i, '').trim();
}

function indexStory(entry) {
  const text = el('div');
  text.append(el('h3', entry.storyTitle || entry.heading || withoutSiteName(entry.title)));
  const summary = entry.storySummary || entry.description;
  if (summary) text.append(el('p', summary));
  const a = el('a', entry.storyLinkText || LINK_TEXT);
  a.href = entry.href || entry.path;
  const p = el('p');
  p.append(a);
  text.append(p);
  const desktop = usable(entry.image) ? storyPicture(entry.image, 750) : null;
  const mobile = usable(entry.mobileImage) ? storyPicture(entry.mobileImage, 750) : null;
  return storyItem(desktop || mobile, desktop && mobile, text);
}

/**
 * fill what the index lacks from the page itself: its story properties and description
 * (head meta), its first heading, and its hero images (desktop, mobile) or first image
 */
async function summarise(entry) {
  const out = {
    ...entry,
    image: usable(entry.image) ? entry.image : '',
    mobileImage: usable(entry.mobileImage) ? entry.mobileImage : '',
  };
  if ((out.storyTitle || out.heading) && (out.storySummary || out.description) && out.image) {
    return out;
  }
  try {
    // published pages answer on their path; author pages need .html (entry.href)
    const resp = await fetch(entry.href || entry.path);
    if (!resp.ok) return out;
    const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
    const base = new URL(entry.href || entry.path, window.location.origin);
    // keep the query: author image URLs can carry rendition parameters
    const local = (src) => {
      const u = new URL(src, base);
      return u.origin === window.location.origin ? `${u.pathname}${u.search}` : u.href;
    };
    const meta = (name) => doc.head.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
      ?.getAttribute('content')?.trim();
    const main = doc.querySelector('main') || doc.body;
    const heroImages = [...main.querySelectorAll('.hero img')]
      .map((img) => img.getAttribute('src')).filter(usable);
    const firstImage = [...main.querySelectorAll('img')]
      .map((img) => img.getAttribute('src')).find(usable);
    out.storyTitle ||= meta('story-title');
    out.storySummary ||= meta('story-summary');
    out.storyLinkText ||= meta('story-link-text');
    out.storyOrder ||= meta('story-order');
    out.heading ||= main.querySelector('h1, h2')?.textContent.trim();
    out.description ||= meta('description');
    // published: og:image is the page's Image property (else its first image); author pages
    // fill og:image with a site default, so the hero comes first there
    const ogImage = meta('og:image');
    const shareImage = usable(ogImage) ? local(ogImage) : '';
    const pageImage = heroImages[0] || firstImage;
    if (!out.image) {
      out.image = AUTHOR_ROOT ? (pageImage && local(pageImage)) || shareImage
        : shareImage || (pageImage && local(pageImage)) || '';
    }
    const mobileMeta = meta('story-mobile-image');
    if (!out.mobileImage && usable(mobileMeta)) out.mobileImage = local(mobileMeta);
    if (!out.mobileImage && heroImages[1]) out.mobileImage = local(heroImages[1]);
  } catch {
    // page unreadable: keep what the index had
  }
  return out;
}

const label = (e) => String(e.storyTitle || e.heading || e.title);
const byOrder = (a, b) => (Number(a.storyOrder) || 999) - (Number(b.storyOrder) || 999)
  || label(a).localeCompare(label(b));
const byLatest = (a, b) => (Number(b.lastModified) || 0) - (Number(a.lastModified) || 0);

/** the pages of a folder, current page excluded, sorted and cut (latest first is cut early) */
async function sortAndSummarise(pages, { limit, order }) {
  const here = normalise(window.location.pathname);
  let list = pages.filter((e) => normalise(e.path) !== here);
  if (order === 'latest') list = list.sort(byLatest).slice(0, limit);
  const entries = await Promise.all(list.map(summarise));
  return order === 'latest' ? entries : entries.sort(byOrder).slice(0, limit);
}

/** published site: the folder's direct child pages from the query index */
async function fromIndex(folder, options) {
  const resp = await fetch(`${INDEX}?limit=2000`);
  if (!resp.ok) return [];
  const { data = [] } = await resp.json();
  const prefix = folder === '/' ? '/' : `${folder}/`;
  const pages = data.filter((e) => e.path && e.path.startsWith(prefix) && e.path !== prefix
    && !e.path.slice(prefix.length).includes('/')
    && !/^\/([a-z]{2}(-[a-z]{2})?\/)?(nav|footer|fragments)(\/|$|-)/.test(e.path));
  return sortAndSummarise(pages, options);
}

/** Universal Editor (AEM author): the folder's child pages and their page properties */
async function fromAuthor(folder, options) {
  const root = `${AUTHOR_ROOT}${folder === '/' ? '' : folder}`;
  const resp = await fetch(`${root}.2.json`);
  if (!resp.ok) return [];
  const json = await resp.json();
  const pages = Object.entries(json)
    .filter(([, v]) => v && v['jcr:primaryType'] === 'cq:Page' && v['jcr:content'])
    .map(([name, { 'jcr:content': c }]) => ({
      path: `${root}/${name}`,
      href: `${root}/${name}.html`,
      title: c['jcr:title'] || name,
      description: c['jcr:description'],
      image: c.image,
      mobileImage: c['story-mobile-image'],
      storyTitle: c['story-title'],
      storySummary: c['story-summary'],
      storyLinkText: c['story-link-text'],
      storyOrder: c['story-order'],
      lastModified: Date.parse(c['cq:lastModified'] || '') / 1000 || 0,
    }));
  return sortAndSummarise(pages, options);
}

export default async function decorate(block) {
  const config = readConfig(block);
  // the stories' look (list, section layout) lives in the stories block's stylesheet
  block.classList.add('stories');
  block.parentElement?.classList.add('stories-wrapper');
  block.closest('.section')?.classList.add('stories-container');
  const css = loadCSS(`${window.hlx.codeBasePath}/blocks/stories/stories.css`);

  const list = el('ul', '', 'stories__list');
  block.replaceChildren(list);
  const prompt = (message) => {
    if (AUTHOR_ROOT) block.append(el('p', message, 'stories-folder__placeholder'));
  };
  if (!config.folder) {
    prompt('Pick a folder to show its pages as stories.');
    await css;
    return;
  }

  block.dataset.folder = config.folder;
  try {
    const options = { limit: config.count, order: config.order };
    const entries = AUTHOR_ROOT
      ? await fromAuthor(config.folder, options) : await fromIndex(config.folder, options);
    list.append(...entries.map(indexStory));
    if (!entries.length) prompt(`No pages found in ${config.folder}.`);
  } catch {
    // listing unavailable: nothing to show
  }
  await css;
}
