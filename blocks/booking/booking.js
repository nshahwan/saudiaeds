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
 * saudiaeds/booking-engine-by-path — author inside Universal Editor, publish on the site); the
 * authored rows render first and stay as the fallback when the fragment cannot be loaded.
 * Universal Editor: from a fragment, the widget is a reference to it (single-value labels and the
 * links' labels are edited inline, everything in the Content Fragment editor). From the authored
 * rows, the labels sit between generated controls, so the cells' inline instrumentation is not
 * carried over — the block is edited from the properties panel.
 * @param {Element} block The booking block element
 */

const QUERY = '/graphql/execute.json/saudiaeds/booking-engine-by-path';
// AEM environment of this site (fstab.yaml); <meta name="aem-publish-host"> overrides publish
const AEM_AUTHOR = 'https://author-p208666-e2180259.adobeaemcloud.com';
const AEM_PUBLISH = 'https://publish-p208666-e2180259.adobeaemcloud.com';
const TIMEOUT = 4000;

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
function para(text, prop, label) {
  const p = el('p', null, text || '');
  if (prop) Object.assign(p.dataset, { aueProp: prop, aueLabel: label, aueType: 'text' });
  return p;
}

function linkPara(link) {
  if (!link) return null;
  const a = el('a', null, link.label || '');
  a.href = link.url || '#';
  if (link.external) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  if (link.path) {
    Object.assign(a.dataset, {
      aueResource: `urn:aemconnection:${link.path}/jcr:content/data/master`,
      aueType: 'reference',
      aueLabel: `Link: ${link.label}`,
      aueProp: 'label',
    });
  }
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

/** load the Booking Engine fragment; null when it is not reachable (the authored rows stay) */
async function loadFragment(path, variation) {
  const meta = document.querySelector('meta[name="aem-publish-host"]')?.content;
  // inside Universal Editor the page is served by the author: query it there (session cookie)
  const onAuthor = window.location.origin === AEM_AUTHOR || /^author-/.test(window.location.hostname);
  const host = onAuthor ? window.location.origin : (meta || AEM_PUBLISH);
  const url = `${host}${QUERY};path=${encodeURIComponent(path)};variation=${encodeURIComponent(variation || 'master')}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const resp = await fetch(url, { credentials: onAuthor ? 'include' : 'omit', signal: ctl.signal });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json?.data?.bookingEngineByPath?.item || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const [fragmentCell, variationCell] = cells.slice(4);
  const path = fragmentCell?.querySelector('a')?.getAttribute('href') || fragmentCell?.textContent.trim();
  const variation = variationCell?.textContent.trim();

  block.replaceChildren(...render(fromCells(cells.slice(0, 4))));
  if (!path || !path.startsWith('/content/dam/')) return;

  const item = await loadFragment(path, variation);
  if (!item) return;
  // the widget is a reference to the fragment: selectable and editable in Universal Editor
  const widget = el('div', 'booking__fragment', ...render(fromFragment(item)));
  Object.assign(widget.dataset, {
    aueResource: `urn:aemconnection:${path}/jcr:content/data/${variation || 'master'}`,
    aueType: 'reference',
    aueLabel: 'Booking engine content fragment',
  });
  if (block.dataset.aueResource) block.dataset.aueType = 'container';
  block.replaceChildren(widget);
  block.classList.add('booking--fragment');
}
