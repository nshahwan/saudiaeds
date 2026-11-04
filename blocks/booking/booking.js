/**
 * booking — static initial state of Saudia's flight-booking widget (dynamics D-01:
 * the live widget is an Angular app; integrate it here when the embed method is agreed).
 *
 * Rows (xwalk model `booking`), two single-cell rows in order, even if variation is empty:
 *   1. fragment           the Booking Engine Content Fragment (required; link or path)
 *   2. fragmentVariation  its variation (hidden, set by the fragment picker; empty = master)
 * Earlier content carried four authored label rows (tabs, trip, route, info) before these; they
 * are skipped. The widget's tabs, trip types, route labels, notice and links all come from the
 * fragment (AEM GraphQL persisted query <namespace>/booking-engine-by-path) and its Booking Link
 * fragments.
 *
 * Content Fragment handling follows waringme/eds-reusable-blocks content-fragment strictly:
 * settings in window.edsReusableBlocks.contentFragment (scripts.js; aem-publish-host /
 * aem-query-namespace metadata as fallbacks); author = an author-*.adobeaemcloud.com host,
 * queried on the current origin with same-origin credentials, the site queries publish without
 * credentials; the path keeps its slashes, a `ts` parameter busts caches (5-minute buckets for
 * visitors); variations are lower case with underscores; only /content/dam paths. A missing
 * selection shows a picker prompt; a fragment that can't be loaded (or isn't a Booking Engine)
 * shows a visible failure and logs an error (with the detail on author).
 * Universal Editor (author only): the widget is a reference to the fragment, its single-value
 * labels and the links' labels are edited in place; everything else in the Content Fragment
 * editor.
 * @param {Element} block The booking block element
 */

const QUERY = ['booking-engine-by-path', 'bookingEngineByPath'];
const DAM_ROOT = '/content/dam';
const CACHE_WINDOW = 5 * 60 * 1000; // visitors may see a fragment up to 5 minutes old
const TIMEOUT = 4000; // a fragment that doesn't answer in time counts as unavailable

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
    // AEM answers GraphQL problems (e.g. a query that isn't persisted or published) with an
    // `errors` array, whatever the status: report its messages rather than a bare status
    const json = await resp.json().catch(() => null);
    const errors = (json?.errors || []).map((e) => [e.errorType, e.message].filter(Boolean).join(': '));
    if (errors.length) throw new Error(`${namespace}/${name}: ${errors.join('; ')}`);
    if (!resp.ok) throw new Error(`${resp.status} ${namespace}/${name}`);
    const item = json?.data?.[field]?.item;
    // a Booking Engine has its own fields (another model's partial item has none)
    if (!item || !Array.isArray(item.tabs)) throw new Error('not a Booking Engine fragment');
    return item;
  } finally {
    clearTimeout(timer);
  }
}

/** a visible status line in place of the widget (prompt or failure) */
function message(text) {
  const p = el('p', 'booking__message', text);
  p.setAttribute('role', 'status');
  return p;
}

/** row 1 the fragment (link or path), row 2 the picked variation (after 4 legacy label rows) */
function readConfig(block) {
  const rows = [...block.children];
  const [fragmentRow, variationRow] = rows.length >= 6 ? rows.slice(4) : rows;
  const link = fragmentRow?.querySelector('a');
  const raw = (link ? link.getAttribute('href') : fragmentRow?.textContent)?.trim();
  let path = null;
  if (raw) {
    path = new URL(raw, window.location.origin).pathname.replace(/\.[a-z]+$/, '');
    if (!path.startsWith(`${DAM_ROOT}/`)) path = null;
  }
  const variation = variationRow?.textContent.trim().toLowerCase().replace(/\s+/g, '_') || 'master';
  return { path, variation };
}

export default async function decorate(block) {
  let path;
  try {
    const config = readConfig(block);
    ({ path } = config);
    const { variation } = config;
    block.textContent = '';
    if (!path) {
      block.append(message('Select a booking engine content fragment under /content/dam/.'));
      return;
    }
    const item = await loadFragment(path, variation);
    // the widget is a reference to the fragment: selectable and editable in Universal Editor
    const widget = resource(el('div', 'booking__fragment', ...render(fromFragment(item))), path, `Booking engine content fragment (${variation})`, variation);
    if (isAuthor() && block.dataset.aueResource) block.dataset.aueType = 'container';
    block.replaceChildren(widget);
    block.classList.add('booking--fragment');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('booking: could not load booking engine fragment', path, e);
    const detail = isAuthor() ? ` (${e.message})` : '';
    block.replaceChildren(message(`Could not load booking engine fragment ${path || ''}${detail}.`));
  }
}
