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
import {
  AUTHOR_ROOT, readStoryPage, storyItem, storyPicture, storyText, usable,
} from '../stories/stories.js';

const INDEX = '/query-index.json';

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

/** page titles carry the site name ("… | Saudia"); the story heading drops it */
function withoutSiteName(title = '') {
  return title.replace(/^Saudia\s*[|–-]\s*|\s*[|–-]\s*Saudia$/i, '').trim();
}

function indexStory(entry) {
  const text = storyText({
    title: entry.storyTitle || entry.heading || withoutSiteName(entry.title),
    summary: entry.storySummary || entry.description,
    linkText: entry.storyLinkText,
  }, entry.href || entry.path);
  const desktop = usable(entry.image) ? storyPicture(entry.image, entry.imageAlt) : null;
  const mobile = usable(entry.mobileImage) ? storyPicture(entry.mobileImage, entry.imageAlt) : null;
  return storyItem(desktop || mobile, desktop && mobile, text);
}

/**
 * fill what the index lacks from the page itself (see readStoryPage in blocks/stories); the
 * page's images win: the indexed og:image is often just the page's (generic) hero banner
 */
async function summarise(entry) {
  const out = {
    ...entry,
    image: usable(entry.image) ? entry.image : '',
    mobileImage: usable(entry.mobileImage) ? entry.mobileImage : '',
  };
  const page = await readStoryPage(entry.href || entry.path);
  if (!page) return out;
  const { image, imageAlt, mobileImage } = page;
  Object.entries(page).forEach(([key, value]) => { out[key] ||= value; });
  if (image) Object.assign(out, { image, imageAlt, mobileImage });
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
