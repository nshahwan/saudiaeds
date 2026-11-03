/**
 * booking — static initial state of Saudia's flight-booking widget (dynamics D-01:
 * the live widget is an Angular app; integrate it here when the embed method is agreed).
 *
 * Rows (xwalk model `booking`):
 *   1. tabs      <ul> of tab labels (first = active) · then either one <p> with a promo link
 *                (Flight + Hotel, external-link icon) or several <p> quick links (home:
 *                Stopover, Flight + Hotel, Umrah, Hotels — the first three show on mobile)
 *   2. trip      <p> per trip type (first = selected) · last <p> Book with Miles (desktop only)
 *   3. route     <p> From label · <p> default origin (desktop only) · <p> To label
 *   4. info      <p> travel-requirements message · <p> with the Learn more link
 *   5. fragment  optional Booking Engine Content Fragment (path link)
 *   6. fragmentVariation  its variation (hidden, set by the fragment picker)
 *
 * With a fragment, the widget's labels and links come from it (AEM GraphQL persisted query
 * <namespace>/booking-engine-by-path); the authored rows render first and stay as the fallback
 * when the fragment cannot be loaded (the error is logged, and shown on author only — the
 * reference block shows it to everyone).
 * Content Fragment delivery follows waringme/eds-reusable-blocks content-fragment: settings in
 * window.edsReusableBlocks.contentFragment (scripts.js; aem-publish-host / aem-query-namespace
 * metadata as fallbacks); author = an author-*.adobeaemcloud.com host, queried on the current
 * origin with same-origin credentials, the site queries publish without credentials; the path
 * keeps its slashes, a `ts` parameter busts caches (5-minute buckets for visitors); variations are
 * lower case with underscores (empty = master); editor annotations only on author.
 * Universal Editor: from a fragment, the widget is a reference to it (single-value labels and the
 * links' labels are edited inline, everything in the Content Fragment editor). From the authored
 * rows, the labels sit between generated controls, so the cells' inline instrumentation is not
 * carried over — the block is edited from the properties panel.
 * @param {Element} block The booking block element
 */

const QUERY = ['booking-engine-by-path', 'bookingEngineByPath'];
const DAM_ROOT = '/content/dam';
const CACHE_WINDOW = 5 * 60 * 1000; // visitors may see a fragment up to 5 minutes old
const TIMEOUT = 4000; // a fragment that doesn't answer in time leaves the authored rows

const settings = () => window.edsReusableBlocks?.contentFragment || {};
const metadata = (name) => document.head.querySelector(`meta[name="${name}"]`)?.content?.trim();

/** AEM author (Universal Editor): an author-*.adobeaemcloud.com host, unless configured */
const isAuthor = () => settings().author ?? (
  window.location.hostname.startsWith('author-')
  && window.location.hostname.endsWith('.adobeaemcloud.com')
);

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

/** Universal Editor (author only): a fragment as an editable reference */
function resource(node, path, label, variation = 'master') {
  if (node && isAuthor() && path) {
    Object.assign(node.dataset, {
      aueResource: `urn:${settings().connection || 'aemconnection'}:${path}/jcr:content/data/${variation}`,
      aueType: 'reference',
      aueFilter: 'cf',
      aueLabel: label,
    });
  }
  return node;
}

/** Universal Editor (author only): a fragment field edited in place */
function prop(node, name, type, label) {
  if (node && isAuthor()) {
    Object.assign(node.dataset, { aueProp: name, aueType: type, aueLabel: label });
  }
  return node;
}

function el(tag, className, ...kids) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  e.append(...kids.filter(Boolean));
  return e;
}

function icon(name, extra = '') {
  const s = el('span', `ico ico-${name} ${extra}`.trim());
  s.setAttribute('aria-hidden', 'true');
  return s;
}

/** a <p> holding text, optionally instrumented as a Content Fragment text field */
function para(text, name, label) {
  const p = el('p', null, text || '');
  return name ? prop(p, name, 'text', label) : p;
}

function linkPara(link) {
  if (!link) return null;
  const a = el('a', null, link.label || '');
  a.href = link.url || '#';
  if (link.external) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  // a Booking Link fragment: its label is edited in place
  if (link.path) prop(resource(a, link.path, `Link: ${link.label}`), 'label', 'text', 'Label');
  return el('p', null, a);
}

/** the authored rows as widget nodes (moved, not copied — EW1) */
function fromCells(cells) {
  const ps = (cell) => (cell ? [...cell.querySelectorAll(':scope > p')] : []);
  const [tabsCell, tripCell, routeCell, infoCell] = cells;
  const trips = ps(tripCell);
  const miles = trips.length > 1 ? trips.pop() : null;
  const [fromLabel, origin, toLabel] = ps(routeCell);
  const [message, more] = ps(infoCell);
  return {
    tabs: tabsCell ? tabsCell.querySelector('ul') : null,
    links: ps(tabsCell),
    trips,
    miles,
    fromLabel,
    origin,
    toLabel,
    message,
    more,
    swapLabel: 'Click here to swap to and from Destinations',
  };
}

/** a Booking Engine fragment (GraphQL item) as widget nodes, instrumented for Universal Editor */
function fromFragment(item) {
  const asLink = (l) => l && {
    // eslint-disable-next-line no-underscore-dangle
    label: l.label, url: l.url, external: l.external, path: l._path,
  };
  const tabs = el('ul', null, ...(item.tabs || []).map((t) => el('li', null, t)));
  return {
    tabs,
    links: (item.links || []).map((l) => linkPara(asLink(l))),
    trips: (item.tripTypes || []).map((t) => para(t)),
    miles: item.milesLabel ? para(item.milesLabel, 'milesLabel', 'Miles toggle label') : null,
    fromLabel: para(item.fromLabel, 'fromLabel', 'From label'),
    origin: item.defaultOrigin ? para(item.defaultOrigin, 'defaultOrigin', 'Default origin') : null,
    toLabel: para(item.toLabel, 'toLabel', 'To label'),
    message: para(item.infoMessage, 'infoMessage', 'Notice message'),
    more: linkPara(asLink(item.infoLink)),
    swapLabel: item.swapLabel || 'Click here to swap to and from Destinations',
  };
}

function render(d) {
  const tabsBox = el('div', 'booking__tabs', d.tabs);
  tabsBox.setAttribute('role', 'tablist');
  if (d.tabs) {
    [...d.tabs.children].forEach((li, i) => {
      li.setAttribute('role', 'tab');
      li.setAttribute('aria-selected', String(i === 0));
    });
  }

  const promos = d.links.filter(Boolean);
  const promoBox = promos.length === 1 ? el('div', 'booking__promo', promos[0], icon('call_made')) : null;
  const links = promos.length > 1 ? el('ul', 'booking__links', ...promos.map((p) => el('li', null, p))) : null;

  const radio = (p, checked) => el('div', `radio${checked ? ' is-checked' : ''}`, el('span', 'radio__ring'), p);
  const options = el(
    'div',
    'booking__options',
    el('div', 'booking__trip', ...d.trips.map((p, i) => radio(p, i === 0))),
    d.miles ? el('div', 'toggle', el('span', 'toggle__track', el('span', 'toggle__thumb')), el('div', 'toggle__label', d.miles)) : null,
  );

  const swap = el('button', 'booking__swap', icon('swap_horiz'));
  swap.type = 'button';
  swap.setAttribute('aria-label', d.swapLabel);
  const fields = el(
    'div',
    'booking__fields',
    el('div', 'field field--from', el('div', 'field__label', d.fromLabel), el('div', 'field__value', d.origin), icon('flight_takeoff', 'field__icon')),
    swap,
    el('div', 'field field--to', el('div', 'field__label', d.toLabel), icon('flight_land', 'field__icon')),
  );

  const info = el(
    'div',
    'booking__info',
    icon('info', 'booking__info-icon'),
    el('div', 'booking__info-text', d.message),
    el('div', 'booking__info-more', d.more, icon('chevron_right', 'booking__chev-d'), icon('arrow_forward', 'booking__chev-m')),
  );

  return [el('div', 'booking__panel', tabsBox, promoBox, options, fields), links, info].filter(Boolean);
}

/** load the Booking Engine fragment (GraphQL item); throws when it can't be loaded */
async function loadFragment(path, variation) {
  const namespace = settings().queryNamespace || metadata('aem-query-namespace');
  if (!namespace || !/^[\w-]+$/.test(namespace)) {
    throw new Error('Configure contentFragment.queryNamespace or aem-query-namespace metadata');
  }
  const [name, field] = QUERY;
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
    // a Booking Engine has its own fields (another model's partial item has none)
    if (!item || !Array.isArray(item.tabs)) throw new Error('not a Booking Engine fragment');
    return item;
  } finally {
    clearTimeout(timer);
  }
}

export default async function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const [fragmentCell, variationCell] = cells.slice(4);
  // the picked fragment: a /content/dam/ path (link or text, extension dropped)
  const raw = (fragmentCell?.querySelector('a')?.getAttribute('href') || fragmentCell?.textContent)?.trim();
  let path = raw ? new URL(raw, window.location.origin).pathname.replace(/\.[a-z]+$/, '') : '';
  if (!path.startsWith(`${DAM_ROOT}/`)) path = '';
  // the picked variation: lower case, spaces as underscores; empty means master
  const variation = variationCell?.textContent.trim().toLowerCase().replace(/\s+/g, '_') || 'master';

  block.replaceChildren(...render(fromCells(cells.slice(0, 4))));
  if (!path) return;

  let item;
  try {
    item = await loadFragment(path, variation);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('booking: could not load booking engine fragment', path, e);
    if (isAuthor()) {
      // authors see why the widget shows its authored labels (outside every field)
      const message = el('p', 'booking__message', `Could not load booking engine fragment ${path} (${e.message}); showing the authored labels.`);
      message.setAttribute('role', 'status');
      block.prepend(message);
    }
    return;
  }
  // the widget is a reference to the fragment: selectable and editable in Universal Editor
  const widget = resource(el('div', 'booking__fragment', ...render(fromFragment(item))), path, `Booking engine content fragment (${variation})`, variation);
  if (isAuthor() && block.dataset.aueResource) block.dataset.aueType = 'container';
  block.replaceChildren(widget);
  block.classList.add('booking--fragment');
}
