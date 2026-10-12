/**
 * booking — static initial state of Saudia's flight-booking widget (dynamics D-01:
 * the live widget is an Angular app; integrate it here when the embed method is agreed).
 *
 * Rows (xwalk model `booking`), one richtext cell each:
 *   1. tabs   <ul> of tab labels (first = active) · then either one <p> with a promo link
 *             (Flight + Hotel, external-link icon) or several <p> quick links (home: Stopover,
 *             Flight + Hotel, Umrah, Hotels — the first three show on mobile)
 *   2. trip   <p> per trip type (first = selected) · last <p> Book with Miles (desktop only)
 *   3. route  <p> From label · <p> default origin (desktop only) · <p> To label
 *   4. info   <p> travel-requirements message · <p> with the Learn more link
 *
 * Authored paragraphs are MOVED into the widget layout (EW1); controls carry no text.
 * Universal Editor: the labels sit between generated controls (tabs, radios, swap button), so
 * the cells' inline instrumentation is deliberately not carried over — the block is edited from
 * the properties panel (the block keeps its own instrumentation), and an inline save can never
 * write generated controls into the content.
 * @param {Element} block The booking block element
 */

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

export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const ps = (cell) => (cell ? [...cell.querySelectorAll(':scope > p')] : []);
  const [tabsCell, tripCell, routeCell, infoCell] = cells;

  const tabs = tabsCell ? tabsCell.querySelector('ul') : null;
  const tabsBox = el('div', 'booking__tabs', tabs);
  tabsBox.setAttribute('role', 'tablist');
  if (tabs) {
    [...tabs.children].forEach((li, i) => {
      li.setAttribute('role', 'tab');
      li.setAttribute('aria-selected', String(i === 0));
    });
  }

  const promos = ps(tabsCell);
  const promoBox = promos.length === 1 ? el('div', 'booking__promo', promos[0], icon('call_made')) : null;
  const links = promos.length > 1 ? el('ul', 'booking__links', ...promos.map((p) => el('li', null, p))) : null;

  const trips = ps(tripCell);
  const miles = trips.length > 1 ? trips.pop() : null;
  const radio = (p, checked) => el('div', `radio${checked ? ' is-checked' : ''}`, el('span', 'radio__ring'), p);
  const options = el(
    'div',
    'booking__options',
    el('div', 'booking__trip', ...trips.map((p, i) => radio(p, i === 0))),
    miles ? el('div', 'toggle', el('span', 'toggle__track', el('span', 'toggle__thumb')), el('div', 'toggle__label', miles)) : null,
  );

  const [fromLabel, origin, toLabel] = ps(routeCell);
  const swap = el('button', 'booking__swap', icon('swap_horiz'));
  swap.type = 'button';
  swap.setAttribute('aria-label', 'Click here to swap to and from Destinations');
  const fields = el(
    'div',
    'booking__fields',
    el('div', 'field field--from', el('div', 'field__label', fromLabel), el('div', 'field__value', origin), icon('flight_takeoff', 'field__icon')),
    swap,
    el('div', 'field field--to', el('div', 'field__label', toLabel), icon('flight_land', 'field__icon')),
  );

  const [message, more] = ps(infoCell);
  const info = el(
    'div',
    'booking__info',
    icon('info', 'booking__info-icon'),
    el('div', 'booking__info-text', message),
    el('div', 'booking__info-more', more, icon('chevron_right', 'booking__chev-d'), icon('arrow_forward', 'booking__chev-m')),
  );

  block.replaceChildren(...[el('div', 'booking__panel', tabsBox, promoBox, options, fields), links, info].filter(Boolean));
}
