/**
 * stories — editorial story list (Saudia replica, home "Exceptional experiences with Saudia";
 * live: app-jss-image-link-list news teasers). Sits beside the section's default content
 * (heading + intro) on desktop.
 *
 * Rows (xwalk item model `story`), one per story:
 *   1. pressRelease link to the press release the story shows (properties panel)
 *   2. image        desktop rendition (<picture>, used without a press release)
 *   3. mobileImage  mobile rendition (<picture>, used without a press release)
 *   4. text         <h3> title · <p> summary · <p> link (used without a press release)
 * With a press release picked, the story always takes its title (Story title, else first
 * heading), summary (Story summary, else description), images (Image / Story mobile image, else
 * the article or hero image) and link from that page, so picking another press release changes
 * the whole story; the authored fields are the fallback when none is picked or it can't be read.
 * Rows authored before the press release field (3 cells: image, mobileImage, text) still render.
 *
 * Authored nodes are MOVED and the text cell is reused (EW1, editor instrumentation kept); the
 * link stays in its paragraph and a CSS stretched link makes the whole story clickable.
 * Generated press release text goes into its own slot, never into the text field.
 * @param {Element} block The stories block element
 */

const LINK_TEXT = 'Learn more';

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

/** the generated text slot: <h3> title · <p> summary · <p><a> link */
export function storyText({ title, summary, linkText }, href) {
  const text = el('div');
  if (title) text.append(el('h3', title));
  if (summary) text.append(el('p', summary));
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

/** the press release cell (4-cell rows): its link, or a path typed as text */
function pressReleaseOf(cell) {
  const a = cell.querySelector('a');
  const raw = a ? a.getAttribute('href') : cell.textContent.trim();
  return raw && /^(\/|https?:)/.test(raw) ? raw : '';
}

async function decorateRow(row) {
  const linkCell = row.children.length > 3 ? row.firstElementChild : null;
  const href = linkCell ? pressReleaseOf(linkCell) : '';
  // cells not shown stay in the item, hidden, so they keep their editor instrumentation: the
  // press release (picked in the properties panel) and authored fields the press release replaces
  const hiddenCells = [];
  const hide = (cell) => {
    if (!cell) return;
    cell.remove();
    cell.hidden = true;
    hiddenCells.push(cell);
  };
  hide(linkCell);

  let [desktop, mobile] = [...row.querySelectorAll('picture')];
  const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
  const textCell = heading ? heading.parentElement : row.lastElementChild;
  // the text cell is reused as the text slot (keeps its editor instrumentation); the authored
  // link stays in place and is stretched over the whole story by CSS
  let text = textCell?.textContent.trim() ? textCell : null;

  // a picked press release supplies the story; the authored fields are the fallback for
  // stories without one (or a press release that can't be read)
  const page = href ? await readStoryPage(href) : null;
  if (page) {
    if (usable(page.image)) {
      const cellOf = (pic) => pic && [...row.children].find((cell) => cell.contains(pic));
      [desktop, mobile].forEach((pic) => hide(cellOf(pic)));
      desktop = storyPicture(page.image, page.imageAlt);
      mobile = usable(page.mobileImage) ? storyPicture(page.mobileImage, page.imageAlt) : null;
    }
    if (text) hide(textCell);
    text = storyText({
      title: page.storyTitle || page.heading,
      summary: page.storySummary || page.description,
      linkText: page.storyLinkText,
    }, href);
  }

  const item = storyItem(desktop || mobile, desktop && mobile, text || textCell || el('div'));
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
