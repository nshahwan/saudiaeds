/**
 * stories — editorial story list (Saudia replica, home "Exceptional experiences with Saudia";
 * live: app-jss-image-link-list news teasers). Sits beside the section's default content
 * (heading + intro) on desktop.
 *
 * Rows (xwalk item model `story`), one per story:
 *   1. fragment           Story content fragment (properties panel)
 *   2. fragmentVariation  its variation (hidden, set by the fragment picker)
 *   3. pressRelease       link to the press release the story shows (properties panel)
 *   4. image              desktop rendition (<picture>, used without a fragment / press release)
 *   5. mobileImage        mobile rendition (<picture>, used without a fragment / press release)
 *   6. text               <h3> title · <p> summary · <p> link (same)
 * The story comes from, in this order:
 *   - a picked Story fragment (AEM GraphQL persisted query saudiaeds/story-by-path, author inside
 *     Universal Editor, publish on the site): its title, summary, images, alt and link text; what
 *     it leaves empty comes from the press release it references, and it links to that press
 *     release (else to its own link). The story is a reference to the fragment in the editor;
 *     the texts and image it supplies are edited in place;
 *   - a picked press release: its title (Story title, else first heading), summary (Story
 *     summary, else description), images (Image / Story mobile image, else the article or hero
 *     image) and link;
 *   - the authored image and text fields (also when the fragment / page can't be loaded).
 * Picking another fragment or press release changes the whole story.
 * Rows authored before these fields (3 cells: image, mobileImage, text; 4 cells: pressRelease,
 * image, mobileImage, text) still render.
 *
 * Authored nodes are MOVED and the text cell is reused (EW1, editor instrumentation kept); the
 * link stays in its paragraph and a CSS stretched link makes the whole story clickable.
 * Generated press release text goes into its own slot, never into the text field.
 * @param {Element} block The stories block element
 */

const LINK_TEXT = 'Learn more';
const STORY_QUERY = '/graphql/execute.json/saudiaeds/story-by-path';
// AEM environment of this site (fstab.yaml, as in blocks/booking); <meta name="aem-publish-host">
// overrides publish
const AEM_AUTHOR = 'https://author-p208666-e2180259.adobeaemcloud.com';
const AEM_PUBLISH = 'https://publish-p208666-e2180259.adobeaemcloud.com';
const SITE_ROOT = '/content/saudiaeds';
const TIMEOUT = 4000;

/**
 * AEM author (Universal Editor): pages are addressed as /content/<site>/… on an AEM host (the
 * local preview also serves /content/… but reads like the published site)
 */
export const AUTHOR_ROOT = /\.adobeaemcloud\.(com|net)$/.test(window.location.hostname)
  ? (window.location.pathname.match(/^\/content\/(?!dam\/)[^/.]+/) || [])[0] : undefined;

// carry the Universal Editor instrumentation of an authored row over to the element that
// replaces it (same as moveInstrumentation in scripts.js, inlined so the block has no imports),
// together with the row's classes: the item's "Text style" options
function moveInstrumentation(from, to) {
  if (from.className) to.classList.add(...from.classList);
  [...from.attributes]
    .filter(({ name }) => name.startsWith('data-aue-') || name.startsWith('data-richtext-'))
    .forEach(({ name, value }) => {
      to.setAttribute(name, value);
      from.removeAttribute(name);
    });
}

function el(tag, text) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

/**
 * an image URL this page can show: not a broken reference, and on AEM author not an Edge
 * Delivery media URL (./media_… only exists on the published site; author serves the DAM)
 */
export const usable = (src) => Boolean(src) && !src.startsWith('about:')
  && !/\/default-meta-image\.(png|jpe?g)/.test(src)
  && !(AUTHOR_ROOT && /\/media_[0-9a-f]+\./.test(src));

/** <picture> for a story image; Edge Delivery media get the usual optimised renditions */
export function storyPicture(src, alt = '') {
  const url = new URL(src, window.location.href);
  const pic = document.createElement('picture');
  const img = document.createElement('img');
  img.alt = alt;
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
  // an image that still fails to load drops its slot rather than showing a broken icon
  img.addEventListener('error', () => pic.closest('.stories__pic')?.remove(), { once: true });
  pic.append(img);
  return pic;
}

/** the generated text slot: <h3> title · <p> summary · <p><a> link (when there is one) */
export function storyText({ title, summary, linkText }, href) {
  const text = el('div');
  if (title) text.append(el('h3', title));
  if (summary) text.append(el('p', summary));
  if (!href) return text;
  const a = el('a', linkText || LINK_TEXT);
  a.href = href;
  const p = el('p');
  p.append(a);
  text.append(p);
  return text;
}

/** published pages answer on their path, the local preview serves them under /content */
function pageUrls(href) {
  const { pathname } = new URL(href, window.location.href);
  const local = !AUTHOR_ROOT && window.location.pathname.startsWith('/content/')
    && !pathname.startsWith('/content/');
  return local ? [href, `/content${pathname}`] : [href];
}

async function fetchPage(href) {
  const [url, fallback] = pageUrls(href);
  const resp = await fetch(url).catch(() => null);
  if (resp?.ok || !fallback) return resp;
  return fetch(fallback).catch(() => null);
}

/**
 * what a page offers as a story: its Story properties and description (head meta), its first
 * heading, and its images (Image / Story mobile image properties, else hero or first image)
 * @param {string} href the page (author pages need .html)
 * @returns {Promise<object|null>} null when the page can't be read
 */
export async function readStoryPage(href) {
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
  const ogImage = meta('og:image');
  const shareImage = usable(ogImage) ? local(ogImage) : '';
  const chosen = !AUTHOR_ROOT && shareImage
    && (!all[0] || pathOf(shareImage) !== pathOf(all[0].getAttribute('src'))) ? shareImage : '';
  const pageImage = pick ? local(pick.getAttribute('src')) : '';
  const mobileMeta = meta('story-mobile-image');
  return {
    heading: main.querySelector('h1, h2')?.textContent.trim(),
    description: meta('description'),
    storyTitle: meta('story-title'),
    storySummary: meta('story-summary'),
    storyLinkText: meta('story-link-text'),
    storyOrder: meta('story-order'),
    image: chosen || pageImage || shareImage,
    imageAlt: (!chosen && pick?.getAttribute('alt')) || '',
    // the hero's mobile rendition only goes with the hero
    mobileImage: (usable(mobileMeta) && local(mobileMeta))
      || (!chosen && pick === hero && heroMobile ? local(heroMobile.getAttribute('src')) : ''),
  };
}

/**
 * one story list item: the media slot (desktop + optional mobile <picture>) and the text slot
 * (shared with stories-folder)
 * @param {Element} [desktop] desktop rendition
 * @param {Element} [mobile] mobile rendition
 * @param {Element} text the text slot (h3 · summary · link paragraph)
 * @returns {Element} the <li>
 */
export function storyItem(desktop, mobile, text) {
  const item = document.createElement('li');
  const story = document.createElement('div');
  story.className = 'stories__item';

  const media = document.createElement('div');
  media.className = 'stories__media';
  [[desktop, mobile ? 'stories__pic--desktop' : ''], [mobile, 'stories__pic--mobile']].forEach(([pic, cls]) => {
    if (!pic) return;
    const slot = document.createElement('div');
    slot.className = `stories__pic ${cls}`.trim();
    slot.append(pic);
    media.append(slot);
  });

  text.classList.add('stories__text');
  story.append(media, text);
  item.append(story);
  return item;
}

/** a reference cell (fragment, press release): its link, or a path typed as text */
function refPath(cell) {
  const a = cell?.querySelector('a');
  const raw = a ? a.getAttribute('href') : cell?.textContent.trim();
  return raw && /^(\/|https?:)/.test(raw) ? raw : '';
}

const onAemAuthor = () => window.location.origin === AEM_AUTHOR
  || /^author-/.test(window.location.hostname);
const aemHost = () => (onAemAuthor() ? window.location.origin
  : document.querySelector('meta[name="aem-publish-host"]')?.content || AEM_PUBLISH);

/** load a Story fragment; null when it is not reachable (the story falls back) */
async function loadStoryFragment(path, variation) {
  const url = `${aemHost()}${STORY_QUERY};path=${encodeURIComponent(path)};variation=${encodeURIComponent(variation)}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const resp = await fetch(url, { credentials: onAemAuthor() ? 'include' : 'omit', signal: ctl.signal });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json?.data?.storyByPath?.item || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* eslint-disable no-underscore-dangle -- AEM GraphQL reference fields */
/** a fragment image (GraphQL ImageRef): the author rendition there, else the optimised delivery */
function fragmentImage(ref) {
  if (!ref) return '';
  if (onAemAuthor()) return ref._authorUrl || ref._path || '';
  return ref._dynamicUrl ? `${aemHost()}${ref._dynamicUrl}` : ref._publishUrl || '';
}

/** a site page from its AEM path: .html on author, the published path on the site */
function pageHref(path) {
  if (!path) return '';
  if (AUTHOR_ROOT || onAemAuthor()) return `${path}.html`;
  return path.startsWith(`${SITE_ROOT}/`) ? path.slice(SITE_ROOT.length) : path;
}

/** a Story fragment as a story; what it leaves empty comes from its press release */
async function fragmentStory(item) {
  const href = pageHref(item.pressRelease?._path);
  /* eslint-enable no-underscore-dangle */
  const image = fragmentImage(item.image);
  const page = href && !(item.title && item.summary && image) ? await readStoryPage(href) : null;
  return {
    title: item.title || page?.storyTitle || page?.heading,
    summary: item.summary || page?.storySummary || page?.description,
    image: image || page?.image || '',
    mobileImage: fragmentImage(item.imageMobile) || (image ? '' : page?.mobileImage || ''),
    imageAlt: item.imageAlt || (image ? '' : page?.imageAlt || ''),
    linkText: item.linkText || page?.storyLinkText,
    href: href || item.link || '',
    // the fields the fragment supplied, edited in place in the editor
    props: { title: Boolean(item.title), summary: Boolean(item.summary), image: Boolean(image) },
  };
}

function pageStory(page, href) {
  return {
    title: page.storyTitle || page.heading,
    summary: page.storySummary || page.description,
    image: page.image,
    mobileImage: page.mobileImage,
    imageAlt: page.imageAlt,
    linkText: page.storyLinkText,
    href,
  };
}

/** the story is a reference to its fragment in Universal Editor; supplied fields edit in place */
function instrumentFragment(story, path, variation, props) {
  Object.assign(story.dataset, {
    aueResource: `urn:aemconnection:${path}/jcr:content/data/${variation}`,
    aueType: 'reference',
    aueLabel: 'Story content fragment',
  });
  const mark = (node, prop, label, type = 'text') => node && Object.assign(node.dataset, {
    aueProp: prop, aueLabel: label, aueType: type,
  });
  if (props.title) mark(story.querySelector('.stories__text h3'), 'title', 'Title');
  if (props.summary) mark(story.querySelector('.stories__text h3 + p, .stories__text > p:first-child'), 'summary', 'Summary');
  if (props.image) mark(story.querySelector('.stories__pic img'), 'image', 'Image (desktop)', 'media');
}

async function decorateRow(row) {
  // reference cells lead the row: [fragment, fragmentVariation,] pressRelease (see above)
  const refs = [...row.children].slice(0, Math.max(0, row.children.length - 3));
  const [fragmentCell, variationCell] = refs.length >= 3 ? refs : [];
  const fragmentPath = refPath(fragmentCell);
  const variation = variationCell?.textContent.trim() || 'master';
  const href = refPath(refs[refs.length - 1]);
  // cells not shown stay in the item, hidden, so they keep their editor instrumentation: the
  // references (picked in the properties panel) and authored fields the story source replaces
  const hiddenCells = [];
  const hide = (cell) => {
    if (!cell) return;
    cell.remove();
    cell.hidden = true;
    hiddenCells.push(cell);
  };
  refs.forEach(hide);

  let [desktop, mobile] = [...row.querySelectorAll('picture')];
  const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
  const textCell = heading ? heading.parentElement : row.lastElementChild;
  // the text cell is reused as the text slot (keeps its editor instrumentation); the authored
  // link stays in place and is stretched over the whole story by CSS
  let text = textCell?.textContent.trim() ? textCell : null;

  // a picked fragment, else a picked press release, supplies the story; the authored fields
  // are the fallback for stories without one (or one that can't be loaded)
  const fragment = fragmentPath.startsWith('/content/dam/')
    ? await loadStoryFragment(fragmentPath, variation) : null;
  let source = fragment ? await fragmentStory(fragment) : null;
  if (!source && href) {
    const page = await readStoryPage(href);
    if (page) source = pageStory(page, href);
  }
  if (source) {
    if (usable(source.image)) {
      const cellOf = (pic) => pic && [...row.children].find((cell) => cell.contains(pic));
      [desktop, mobile].forEach((pic) => hide(cellOf(pic)));
      const { image, mobileImage, imageAlt } = source;
      desktop = storyPicture(image, imageAlt);
      mobile = usable(mobileImage) ? storyPicture(mobileImage, imageAlt) : null;
    }
    if (text) hide(textCell);
    text = storyText(source, source.href);
  }

  const item = storyItem(desktop || mobile, desktop && mobile, text || textCell || el('div'));
  if (fragment) {
    instrumentFragment(item.querySelector('.stories__item'), fragmentPath, variation, source.props);
  }
  item.append(...hiddenCells);
  moveInstrumentation(row, item);
  return item;
}

export default async function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'stories__list';
  const items = await Promise.all([...block.children].map(decorateRow));
  list.append(...items);
  block.replaceChildren(list);
}
