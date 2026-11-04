/**
 * stories — the home "Exceptional experiences with Saudia" story list (Saudia replica; live:
 * app-jss-image-link-list news teasers), beside the section's heading and intro on desktop.
 *
 * Each story is a Story Content Fragment (model `story`: title, summary, image, imageAlt, link),
 * following waringme/eds-reusable-blocks content-fragment:
 *   rows (xwalk item model `story`), two positional cells each:
 *     1. fragment           the Story fragment (link or path under /content/dam/)
 *     2. fragmentVariation  its variation, set by the picker (empty = master)
 *   the fragment comes from the persisted query <namespace>/story-by-path — settings in
 *   window.edsReusableBlocks.contentFragment (scripts.js); author (author-*.adobeaemcloud.com)
 *   queries its own origin with credentials, the site queries publish without; the path keeps
 *   its slashes; `ts` busts caches (5-minute buckets for visitors).
 * Values are set as text; the link and image URL must be http(s) or site paths. No fragment
 * picked shows a prompt; a fragment that can't be loaded shows a message in its place (and logs
 * the error). In Universal Editor (author only) each story is a reference to its fragment, and
 * its title, summary and image are edited in place.
 * @param {Element} block The stories block element
 */

const QUERY = ['story-by-path', 'storyByPath'];
const LINK_TEXT = 'Learn more';
const CACHE_WINDOW = 5 * 60 * 1000; // visitors may see a fragment up to 5 minutes old

const settings = () => window.edsReusableBlocks?.contentFragment || {};
const metadata = (name) => document.head.querySelector(`meta[name="${name}"]`)?.content?.trim();
const isAuthor = () => settings().author ?? (
  window.location.hostname.startsWith('author-')
  && window.location.hostname.endsWith('.adobeaemcloud.com')
);

function el(tag, text) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

/** the generated text slot: <h3> title · <p> summary · <p><a> link (shared with stories-folder) */
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

/**
 * one story list item: the media slot (desktop + optional mobile <picture>) and the text slot
 * (shared with stories-folder)
 */
export function storyItem(desktop, mobile, text) {
  const item = el('li');
  const story = el('div');
  story.className = 'stories__item';
  const media = el('div');
  media.className = 'stories__media';
  [[desktop, mobile ? 'stories__pic--desktop' : ''], [mobile, 'stories__pic--mobile']].forEach(([pic, cls]) => {
    if (!pic) return;
    const slot = el('div');
    slot.className = `stories__pic ${cls}`.trim();
    slot.append(pic);
    media.append(slot);
  });
  text.classList.add('stories__text');
  story.append(media, text);
  item.append(story);
  return item;
}

/** the AEM origin to query: '' on author (same origin), the configured HTTPS publish origin */
function aemHost() {
  if (isAuthor()) return '';
  const url = new URL(settings().publishHost || metadata('aem-publish-host') || 'about:blank');
  if (url.protocol !== 'https:') throw new Error('Configure contentFragment.publishHost (HTTPS)');
  return url.origin;
}

/** an http(s) URL or a site path, else '' (no javascript:, data: … from fragment values) */
function safeUrl(raw) {
  if (!raw) return '';
  const url = new URL(raw, window.location.origin);
  return /^https?:$/.test(url.protocol) ? raw : '';
}

/** load a Story fragment (GraphQL item); throws with AEM's message when it can't be loaded */
async function fetchStory(path, variation) {
  const namespace = settings().queryNamespace || metadata('aem-query-namespace');
  const [name, field] = QUERY;
  const host = aemHost();
  // AEM does not decode %2F in persisted query parameters: keep the slashes of the path
  const params = `;path=${path.split('/').map(encodeURIComponent).join('/')};variation=${encodeURIComponent(variation)}`;
  const ts = isAuthor() ? Date.now() : Math.floor(Date.now() / CACHE_WINDOW) * CACHE_WINDOW;
  const resp = await fetch(`${host}/graphql/execute.json/${namespace}/${name}${params};ts=${ts}`, {
    credentials: host ? 'omit' : 'same-origin',
  });
  const json = await resp.json().catch(() => null);
  const errors = (json?.errors || []).map((e) => [e.errorType, e.message].filter(Boolean).join(': '));
  if (errors.length) throw new Error(errors.join('; '));
  if (!resp.ok) throw new Error(`${resp.status} ${namespace}/${name}`);
  const item = json?.data?.[field]?.item;
  if (!item?.title) throw new Error('not a Story fragment');
  return item;
}

/** the fragment's image (GraphQL ImageRef / DocumentRef): publish URL, author URL on author */
function storyImage(ref, alt) {
  const host = aemHost();
  const { _publishUrl: publishUrl, _authorUrl: authorUrl, _path: path } = ref || {};
  const src = safeUrl((host ? publishUrl : authorUrl) || path);
  if (!src) return null;
  const img = el('img');
  img.src = src.startsWith('/') ? `${host}${src}` : src;
  img.alt = alt || '';
  img.loading = 'lazy';
  const picture = el('picture');
  picture.append(img);
  return picture;
}

/** Universal Editor (author only): mark a node as a fragment field edited in place */
function prop(node, name, type, label) {
  if (!node || !isAuthor()) return;
  Object.assign(node.dataset, { aueProp: name, aueType: type, aueLabel: label });
}

/** a status line in place of a story (prompt or failure) */
function message(text) {
  const li = el('li');
  const p = el('p', text);
  p.className = 'stories__message';
  p.setAttribute('role', 'status');
  li.append(p);
  return li;
}

async function decorateRow(row) {
  const [fragmentCell, variationCell] = row.children;
  const link = fragmentCell?.querySelector('a');
  const raw = (link ? link.getAttribute('href') : fragmentCell?.textContent)?.trim();
  const path = raw ? new URL(raw, window.location.origin).pathname.replace(/\.[a-z]+$/, '') : '';
  const variation = variationCell?.textContent.trim().toLowerCase().replace(/\s+/g, '_') || 'master';
  if (!path.startsWith('/content/dam/')) return message('Select a story content fragment under /content/dam/.');
  try {
    const item = await fetchStory(path, variation);
    const picture = storyImage(item.image, item.imageAlt);
    // summary is plain text (a model from before package 2.0.0 sent { html }: not shown)
    const summary = typeof item.summary === 'string' ? item.summary : '';
    const text = storyText({ title: item.title, summary }, safeUrl(item.link));
    const li = storyItem(picture, null, text);
    const story = li.firstElementChild;
    if (isAuthor()) {
      Object.assign(story.dataset, {
        aueResource: `urn:${settings().connection || 'aemconnection'}:${path}/jcr:content/data/${variation}`,
        aueType: 'reference',
        aueFilter: 'cf',
        aueLabel: `Story content fragment (${variation})`,
      });
    }
    prop(story.querySelector('h3'), 'title', 'text', 'Title');
    prop(story.querySelector('h3 + p'), 'summary', 'text', 'Summary');
    prop(picture, 'image', 'media', 'Image');
    return li;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('stories: could not load story fragment', path, e);
    const detail = isAuthor() ? ` (${e.message})` : '';
    return message(`Could not load story fragment ${path}${detail}.`);
  }
}

export default async function decorate(block) {
  const rows = [...block.children];
  const items = await Promise.all(rows.map(decorateRow));
  // each story keeps its row's Universal Editor instrumentation and Text style classes, and its
  // picker cells (hidden), so the fragment field stays marked for the editor
  items.forEach((li, i) => {
    const row = rows[i];
    if (row.className) li.classList.add(...row.classList);
    [...row.attributes].filter(({ name }) => name.startsWith('data-aue-')).forEach(({ name, value }) => {
      li.setAttribute(name, value);
    });
    [...row.children].forEach((cell) => { cell.hidden = true; });
    li.append(...row.children);
  });
  const list = el('ul');
  list.className = 'stories__list';
  list.append(...items);
  block.replaceChildren(list);
}
