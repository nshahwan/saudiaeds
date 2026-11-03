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
 *   - a picked Story fragment (AEM GraphQL persisted query <namespace>/story-by-path): its
 *     title, summary (rich text), images, alt and link text; what it leaves empty comes from the
 *     press release it references, and it links to that press release (else to its own link).
 *     In Universal Editor the story is a reference to the fragment and the fields it supplies are
 *     edited in place;
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
 *
 * Content Fragment delivery follows waringme/eds-reusable-blocks content-fragment: settings in
 * window.edsReusableBlocks.contentFragment (scripts.js; aem-publish-host / aem-query-namespace
 * metadata as fallbacks); author = an author-*.adobeaemcloud.com host, queried on the current
 * origin with same-origin credentials, the site queries publish without credentials; the path
 * keeps its slashes, a `ts` parameter busts caches (5-minute buckets for visitors); variations are
 * lower case with underscores (empty = master); image references (ImageRef / DocumentRef) use the
 * publish or author URL; page references lose the site root on Edge Delivery; editor annotations
 * only on author; fragment rich text is sanitised. Unlike the reference, a fragment that can't be
 * loaded falls back to the press release / authored fields: the error is logged, and shown on
 * author only.
 * @param {Element} block The stories block element
 */

const LINK_TEXT = 'Learn more';
const STORY_QUERY = ['story-by-path', 'storyByPath'];
const DAM_ROOT = '/content/dam';
const CACHE_WINDOW = 5 * 60 * 1000; // visitors may see a fragment up to 5 minutes old
const TIMEOUT = 4000; // a fragment that doesn't answer in time falls back

const settings = () => window.edsReusableBlocks?.contentFragment || {};
const metadata = (name) => document.head.querySelector(`meta[name="${name}"]`)?.content?.trim();

/** AEM author (Universal Editor): an author-*.adobeaemcloud.com host, unless configured */
export const isAuthor = () => settings().author ?? (
  window.location.hostname.startsWith('author-')
  && window.location.hostname.endsWith('.adobeaemcloud.com')
);

/**
 * on author, pages are addressed as /content/<site>/… (the local preview also serves /content/…
 * but reads like the published site)
 */
export const AUTHOR_ROOT = isAuthor()
  ? (window.location.pathname.match(/^\/content\/(?!dam\/)[^/.]+/) || [])[0] : undefined;

/** the AEM origin to query: '' on author (same origin), the configured HTTPS publish origin */
function aemHost() {
  if (isAuthor()) return '';
  const raw = settings().publishHost || metadata('aem-publish-host');
  if (!raw) throw new Error('Configure contentFragment.publishHost or aem-publish-host metadata');
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/'
    || url.search || url.hash) throw new Error('publishHost must be an HTTPS origin');
  return url.origin;
}

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

/**
 * the generated text slot: <h3> title · summary (a <p>, or a rich-text <div>) · <p><a> link (when
 * there is one)
 */
export function storyText({ title, summary, linkText }, href) {
  const text = el('div');
  if (title) text.append(el('h3', title));
  if (summary instanceof Element) text.append(summary);
  else if (summary) text.append(el('p', summary));
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

/**
 * an authored page link as this page can follow it: on author, a site path (e.g. /en/…, as the
 * migrated content stores it) becomes its AEM page, <siteRoot><path>.html, like a page reference
 */
function pageLink(raw) {
  if (!raw || !isAuthor() || !raw.startsWith('/') || raw.startsWith(DAM_ROOT)) return raw;
  const path = raw.replace(/\.html$/, '').replace(/\/$/, '');
  if (path.startsWith('/content/')) return `${path}.html`;
  const root = settings().siteRoot?.replace(/\/$/, '');
  return root ? `${root}${path}.html` : raw;
}

/** the picked fragment: a /content/dam/ path (link or text, extension dropped), else null */
function fragmentPathOf(cell) {
  const raw = refPath(cell);
  if (!raw) return null;
  const path = new URL(raw, window.location.origin).pathname.replace(/\.[a-z]+$/, '');
  return path.startsWith(`${DAM_ROOT}/`) ? path : null;
}

/** the picked variation: lower case, spaces as underscores; empty means master */
const variationOf = (cell) => cell?.textContent.trim().toLowerCase().replace(/\s+/g, '_') || 'master';

/** load a Story fragment (GraphQL item); throws when it can't be loaded */
async function loadStoryFragment(path, variation) {
  const namespace = settings().queryNamespace || metadata('aem-query-namespace');
  if (!namespace || !/^[\w-]+$/.test(namespace)) {
    throw new Error('Configure contentFragment.queryNamespace or aem-query-namespace metadata');
  }
  const [name, field] = STORY_QUERY;
  const host = aemHost();
  // AEM does not decode %2F in persisted query parameters: keep the slashes of the path
  const params = `;path=${path.split('/').map(encodeURIComponent).join('/')};variation=${encodeURIComponent(variation)}`;
  const ts = isAuthor() ? Date.now() : Math.floor(Date.now() / CACHE_WINDOW) * CACHE_WINDOW;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const resp = await fetch(`${host}/graphql/execute.json/${namespace}/${name}${params};ts=${ts}`, {
      credentials: host ? 'omit' : 'same-origin',
      signal: ctl.signal,
    });
    if (!resp.ok) throw new Error(`${resp.status} ${namespace}/${name}`);
    const item = (await resp.json())?.data?.[field]?.item;
    if (!item) throw new Error('not a Story fragment');
    return item;
  } finally {
    clearTimeout(timer);
  }
}

/** fragment rich text (multi-line text, HTML) without scripts, handlers or script URLs */
function richText(html, className) {
  if (!html || !String(html).trim()) return null;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  tpl.content.querySelectorAll('script, style, iframe, object, embed').forEach((n) => n.remove());
  tpl.content.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach(({ name, value }) => {
      if (/^on/i.test(name) || name === 'srcdoc'
        || (/^(href|src|xlink:href)$/i.test(name)
          && /^(javascript|vbscript|data):/i.test(value.replace(/\s/g, '')))) {
        node.removeAttribute(name);
      }
    });
  });
  const div = el('div');
  div.className = className;
  div.append(tpl.content);
  return div;
}

/** GraphQL system field `_path` of a fragment, image or page reference */
const pathOf = ({ _path: path } = {}) => path;

/** a fragment image (GraphQL ImageRef / DocumentRef): its publish URL, or author URL on author */
function fragmentImage(ref) {
  if (!ref) return '';
  const host = aemHost();
  const { _publishUrl: publishUrl, _authorUrl: authorUrl, _path: path } = ref;
  const src = (host ? publishUrl : authorUrl) || path || '';
  return src.startsWith('/') ? `${host}${src}` : src;
}

/** a page reference (GraphQL PageRef): the site path on Edge Delivery, the page on author */
function pageHref(ref) {
  const path = pathOf(ref) || '';
  if (!path.startsWith('/content/')) return path;
  if (isAuthor()) return `${path}.html`;
  const root = settings().siteRoot?.replace(/\/$/, '');
  if (root && (path === root || path.startsWith(`${root}/`))) return path.slice(root.length) || '/';
  return path.replace(/^\/content\/[^/]+/, '') || '/';
}

/** a Story fragment as a story; what it leaves empty comes from its press release */
async function fragmentStory(item) {
  const href = pageHref(item.pressRelease);
  const image = fragmentImage(item.image);
  // multi-line text: { html } (a plain string from an earlier single-line model)
  const summaryHtml = typeof item.summary === 'string' ? item.summary : item.summary?.html;
  const summary = /</.test(summaryHtml || '') ? richText(summaryHtml, 'stories__summary') : summaryHtml;
  const page = href && !(item.title && summary && image) ? await readStoryPage(href) : null;
  return {
    title: item.title || page?.storyTitle || page?.heading,
    summary: summary || page?.storySummary || page?.description,
    image: image || page?.image || '',
    mobileImage: fragmentImage(item.imageMobile) || (image ? '' : page?.mobileImage || ''),
    imageAlt: item.imageAlt || (image ? '' : page?.imageAlt || ''),
    linkText: item.linkText || page?.storyLinkText,
    href: href || item.link || '',
    // the fields the fragment supplied, edited in place in the editor
    props: {
      title: Boolean(item.title),
      summary: Boolean(summary),
      image: Boolean(image),
      linkText: Boolean(item.linkText),
    },
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

/**
 * Universal Editor (author only): the story is a reference to its fragment, the fields it
 * supplied are edited in place
 */
function instrumentFragment(story, path, variation, props) {
  if (!isAuthor()) return;
  Object.assign(story.dataset, {
    aueResource: `urn:${settings().connection || 'aemconnection'}:${path}/jcr:content/data/${variation}`,
    aueType: 'reference',
    aueFilter: 'cf',
    aueLabel: `Story content fragment (${variation})`,
  });
  const mark = (node, prop, type, label) => node && Object.assign(node.dataset, {
    aueProp: prop, aueType: type, aueLabel: label,
  });
  const text = story.querySelector('.stories__text');
  if (props.title) mark(text.querySelector('h3'), 'title', 'text', 'Title');
  if (props.summary) {
    const summary = text.querySelector('.stories__summary') || text.querySelector('h3 + p');
    mark(summary, 'summary', summary?.matches('.stories__summary') ? 'richtext' : 'text', 'Summary');
  }
  if (props.image) mark(story.querySelector('.stories__pic picture'), 'image', 'media', 'Image (desktop)');
  if (props.linkText) mark(text.querySelector(':scope > p:last-child a'), 'linkText', 'text', 'Link text');
}

async function decorateRow(row) {
  // reference cells lead the row: [fragment, fragmentVariation,] pressRelease (see above)
  const refs = [...row.children].slice(0, Math.max(0, row.children.length - 3));
  const [fragmentCell, variationCell] = refs.length >= 3 ? refs : [];
  const fragmentPath = fragmentPathOf(fragmentCell);
  const variation = variationOf(variationCell);
  const href = pageLink(refPath(refs[refs.length - 1]));
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
  let fragment = null;
  let failure = null;
  if (fragmentPath) {
    try {
      fragment = await loadStoryFragment(fragmentPath, variation);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('stories: could not load story fragment', fragmentPath, e);
      failure = e;
    }
  }
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
  if (failure && isAuthor()) {
    // authors see why the story shows its fallback (outside every field)
    const message = el('p', `Could not load story fragment ${fragmentPath} (${failure.message}); showing the fallback.`);
    message.className = 'stories__message';
    message.setAttribute('role', 'status');
    item.prepend(message);
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
