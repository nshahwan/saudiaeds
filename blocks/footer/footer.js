import { copyTextOptions, getChromePath } from '../../scripts/scripts.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Saudia footer — template-slotted chrome built from the authored footer fragment
 * (the language root's /footer, e.g. /en/footer; one fragment for every page template).
 *
 * Fragment contract (one section each, in order):
 *   subscribe  <h2>, description <p>, field label <p>, button label <p>
 *   links      brand <p> (logo links), then N × (<h3> + <ul>) link groups,
 *              then the app group: <h3> + <p> of store-badge links
 *              (links with title="External link" get the external-link icon)
 *   awards     3 × (badge-image <p> + caption <p>), then a <ul> of social links
 *              (each link: desktop image, then mobile image), then optionally the payment
 *              partners: title <p> + <p> of logo images (shown on the home template only)
 *   legal      <ul> of legal links, copyright <p>
 *
 * Authored nodes are MOVED (Experience Workspace EW1); generated controls carry no text.
 * @param {Element} block The footer block element
 */

function el(tag, className, ...kids) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  e.append(...kids.filter(Boolean));
  return e;
}

function icon(name) {
  const s = el('span', `ico ico-${name}`);
  s.setAttribute('aria-hidden', 'true');
  return s;
}

function buildSubscribe(section) {
  const [title] = section.querySelectorAll('h2');
  const ps = [...section.querySelectorAll('p')];
  const [desc, label, action] = ps;
  const input = el('input', 'subscribe__input');
  input.type = 'email';
  input.autocomplete = 'email';
  if (label) {
    label.id = 'footer-subscribe-label';
    input.setAttribute('aria-labelledby', label.id);
  }
  const btn = el('div', 'subscribe__btn', action, icon('arrow_forward'));
  btn.setAttribute('role', 'button');
  btn.tabIndex = 0;
  const form = el('form', 'subscribe__form', el('div', 'subscribe__label', label), input, btn);
  form.addEventListener('submit', (e) => e.preventDefault());
  return el('div', 'footer-block subscribe', el('div', 'container', el('div', 'subscribe__copy', title, desc), form));
}

function buildLinks(section) {
  const wrapper = section.querySelector('.default-content-wrapper') || section;
  const nodes = [...wrapper.children];
  const brandP = nodes.find((n) => n.tagName === 'P' && n.querySelector('img'));
  const brand = el('div', 'footer-brand');
  if (brandP) brand.append(brandP);

  const groups = [];
  let apps = null;
  nodes.forEach((n, i) => {
    if (!/^H[2-6]$/.test(n.tagName)) return;
    const next = nodes[i + 1];
    if (next && next.tagName === 'UL') {
      const item = el('div', 'footer-acc__item', el('div', 'footer-acc__head', n, icon('expand_more')), next);
      if (next.querySelector('a[title="External link"]')) item.classList.add('has-ext');
      next.querySelectorAll('a[title="External link"]').forEach((a) => a.append(icon('call_made')));
      groups.push(item);
    } else if (next && next.tagName === 'P') {
      apps = el('div', 'footer-apps', el('div', 'footer-apps__inner', n, el('div', 'footer-apps__badges', next)));
    }
  });

  const acc = el('nav', 'footer-acc');
  acc.setAttribute('aria-label', 'Footer');
  const perCol = Math.ceil(groups.length / 3);
  for (let c = 0; c < 3; c += 1) {
    acc.append(el('div', 'footer-acc__col', ...groups.slice(c * perCol, (c + 1) * perCol)));
  }
  acc.addEventListener('click', (e) => {
    const head = e.target.closest('.footer-acc__head');
    if (head && !window.matchMedia('(min-width: 900px)').matches) head.parentElement.classList.toggle('is-open');
  });
  return el('div', 'footer-block footer-links', el('div', 'container', brand, acc, apps));
}

function buildAwards(section) {
  const wrapper = section.querySelector('.default-content-wrapper') || section;
  const nodes = [...wrapper.children];
  const social = nodes.find((n) => n.tagName === 'UL');
  const awards = el('div', 'awards');
  let current = null;
  (social ? nodes.slice(0, nodes.indexOf(social)) : nodes).forEach((n) => {
    if (n.tagName === 'P' && n.querySelector('img')) {
      current = el('div', 'award', n);
      awards.append(current);
    } else if (n.tagName === 'P' && current) {
      current.append(el('div', 'award__caption', n));
      current = null;
    }
  });
  // optional payment partners after the social links: title <p> + <p> of logo images
  const payments = social ? nodes.slice(nodes.indexOf(social) + 1) : [];
  const side = el(
    'div',
    'footer-awards__side',
    social ? el('div', 'social', social) : null,
    payments.length ? el('div', 'payments', ...payments) : null,
  );
  return el('div', 'footer-block footer-awards', el('div', 'container', awards, side));
}

function buildLegal(section) {
  const list = section.querySelector('ul');
  const copy = [...section.querySelectorAll('p')].pop();
  return el('div', 'footer-block footer-legal', el('div', 'container', list, copy));
}

export default async function decorate(block) {
  const footerPath = getChromePath('footer');
  const fragment = await loadFragment(footerPath);
  block.textContent = '';
  if (!fragment) return;

  const [subscribe, links, awards, legal] = [...fragment.querySelectorAll(':scope > .section')];
  const root = el('div', 'site-footer');
  // each footer band keeps the "Text style" options of the fragment section it is built from
  [[subscribe, buildSubscribe], [links, buildLinks], [awards, buildAwards], [legal, buildLegal]]
    .forEach(([section, build]) => {
      if (!section) return;
      const part = build(section);
      copyTextOptions(section, part);
      root.append(part);
    });
  block.append(root);
}
