import { copyTextOptions, getChromePath } from '../../scripts/scripts.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Saudia header — template-slotted chrome built from the authored nav fragment
 * (the language root's /nav, e.g. /en/nav; one fragment for every page template).
 *
 * Fragment contract (one section each, in order):
 *   [notice]  optional section with style "notice": one paragraph
 *             (<strong>Important Notice:</strong> <a>message</a>)
 *   brand     one paragraph of image links: desktop logo, mobile logo, SkyTeam logo, then
 *             optionally the same three for the dark theme (home template)
 *   menu      a <ul> of top-level menu labels; a label holding a nested list opens a mega menu
 *             (dynamics D-02): each nested item is a group (title + list of links) or, when it
 *             holds an image, the promo card (image, heading link, optional description).
 *             Links titled "External link" get the external-link icon.
 *   tools     paragraphs: [AI search], language (contains the flag image), Login (last)
 *
 * Authored nodes are MOVED into the layout (Experience Workspace EW1); generated controls
 * (close, menu, account) carry no text, only aria-labels.
 * @param {Element} block The header block element
 */

const isDesktop = window.matchMedia('(min-width: 900px)');

function icon(name) {
  const s = document.createElement('span');
  s.className = `ico ico-${name}`;
  s.setAttribute('aria-hidden', 'true');
  return s;
}

function wrap(node, className, tag = 'div') {
  const w = document.createElement(tag);
  w.className = className;
  if (node) w.append(node);
  return w;
}

function control(label, iconName, className) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.setAttribute('aria-label', label);
  b.append(icon(iconName));
  return b;
}

function closeMenus(nav) {
  nav.querySelectorAll('.main-nav > ul > li.is-open').forEach((li) => {
    li.classList.remove('is-open');
    li.querySelector('.menu-label').setAttribute('aria-expanded', 'false');
  });
  document.body.classList.remove('menu-open');
  nav.dispatchEvent(new Event('megatoggle'));
}

function toggleMenu(li, nav) {
  const open = !li.classList.contains('is-open');
  closeMenus(nav);
  li.classList.toggle('is-open', open);
  li.querySelector('.menu-label').setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
  nav.dispatchEvent(new Event('megatoggle'));
}

// live packs consecutive short groups into one column (Plan: Travel information + Flight
// Information) and gives every other group its own column
const COLUMN_LINKS = 4;

function packColumns(groups) {
  const columns = [];
  let count = Infinity;
  groups.forEach((group) => {
    const n = group.querySelectorAll('li').length;
    if (count + n > COLUMN_LINKS) {
      columns.push([]);
      count = 0;
    }
    columns[columns.length - 1].push(group);
    count += n;
  });
  return columns;
}

function decoratePromo(item) {
  item.className = 'mega__promo';
  const media = item.querySelector('picture, img');
  const link = item.querySelector('a');
  // the description is the text that follows the heading link
  const desc = document.createElement('span');
  desc.className = 'mega__promo-desc';
  if (link) {
    let next = link.nextSibling;
    while (next) {
      const cur = next;
      next = next.nextSibling;
      desc.append(cur);
    }
  }
  // live keeps the (empty) description line under a heading-only promo, so it stays put
  const text = wrap(link, 'mega__promo-text');
  text.append(desc);
  const body = wrap(text, 'mega__promo-body');
  body.append(wrap(icon('arrow_forward'), 'mega__promo-go'));
  if (link) link.classList.add('mega__promo-link');
  const holder = media ? media.closest('p') : null;
  item.textContent = '';
  if (media) item.append(media);
  item.append(body);
  if (holder) holder.remove();
}

function buildMega(li, index, nav) {
  const sub = li.querySelector(':scope > ul');
  if (!sub) return;
  // the label: the authored paragraph, or the text before the nested list
  let label = li.querySelector(':scope > p');
  if (!label) {
    label = document.createElement('span');
    [...li.childNodes].filter((n) => n !== sub).forEach((n) => label.append(n));
    li.prepend(label);
  }
  const id = `nav-mega-${index}`;
  label.classList.add('menu-label');
  label.setAttribute('role', 'button');
  label.tabIndex = 0;
  label.setAttribute('aria-expanded', 'false');
  label.setAttribute('aria-controls', id);
  label.addEventListener('click', () => toggleMenu(li, nav));
  label.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggleMenu(li, nav);
  });

  const items = [...sub.querySelectorAll(':scope > li')];
  const promos = items.filter((item) => item.querySelector('img'));
  const groups = items.filter((item) => !promos.includes(item));
  groups.forEach((group) => {
    group.classList.add('mega__group');
    const title = group.querySelector(':scope > p');
    if (title) {
      title.classList.add('mega__title');
      title.setAttribute('role', 'heading');
      title.setAttribute('aria-level', '3');
    }
  });
  promos.forEach(decoratePromo);
  sub.querySelectorAll('a[title="External link"]').forEach((a) => a.append(icon('call_made')));

  const panel = wrap(null, 'mega');
  panel.id = id;
  // mobile drill-down head: back to the menu list, the menu name, close the navigation
  const head = wrap(null, 'mega__head');
  const back = control('Back', 'arrow_back', 'mega__back');
  back.addEventListener('click', () => closeMenus(nav));
  const heading = document.createElement('span');
  heading.className = 'mega__heading';
  heading.textContent = label.textContent.trim();
  const close = control('Close navigation', 'close', 'mega__close');
  close.addEventListener('click', () => nav.querySelector('.menu-btn').click());
  head.append(back, heading, close);

  const inner = wrap(null, 'mega__inner');
  packColumns(groups).forEach((column) => {
    const col = document.createElement('ul');
    col.className = 'mega__col';
    col.append(...column);
    inner.append(col);
  });
  if (promos.length) {
    const aside = document.createElement('ul');
    aside.className = 'mega__aside';
    aside.append(...promos);
    inner.append(aside);
  }
  panel.append(head, inner);
  sub.replaceWith(panel);
  li.classList.add('has-mega');
}

export default async function decorate(block) {
  const navPath = getChromePath('nav');
  const fragment = await loadFragment(navPath);
  block.textContent = '';
  if (!fragment) return;

  const sections = [...fragment.querySelectorAll(':scope > .section')];
  const noticeSection = sections.find((s) => s.classList.contains('notice'));
  const [brand, menu, tools] = sections.filter((s) => s !== noticeSection);

  const root = wrap(null, 'nav-wrapper');

  if (noticeSection) {
    const msg = noticeSection.querySelector('p');
    const notice = wrap(null, 'notice');
    const inner = wrap(null, 'notice__inner');
    if (msg) inner.append(wrap(msg, 'notice__text'));
    inner.append(wrap(icon('navigate_next'), 'notice__next'));
    const close = control('Close notice', 'close', 'notice__close');
    close.addEventListener('click', () => notice.remove());
    inner.append(close);
    notice.append(inner);
    copyTextOptions(noticeSection, notice);
    root.append(notice);
  }

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.className = 'nav-bar';
  nav.setAttribute('aria-expanded', 'false');
  const bar = wrap(null, 'nav-bar__inner');

  // the desktop and mobile logos share a target, so authoring/markdown merges them into
  // one link holding two images: give every image its own link again (same href)
  const logos = brand ? [...brand.querySelectorAll('a')].flatMap((link) => {
    const [, ...extra] = [...link.querySelectorAll(':scope > picture, :scope > img')];
    return [link, ...extra.map((media) => {
      const twin = link.cloneNode(false);
      twin.append(media);
      return twin;
    })];
  }) : [];
  // optional 4th–6th logos are the dark-theme renditions (home), shown instead of 1st–3rd there
  const brandBox = wrap(null, 'nav-brand');
  ['logo-desktop', 'logo-mobile', 'logo-skyteam'].forEach((cls, i) => {
    [logos[i], logos[i + 3]].forEach((link, dark) => {
      if (!link) return;
      link.classList.add(cls, dark ? 'on-dark' : 'on-light');
      brandBox.append(link);
    });
  });
  copyTextOptions(brand, brandBox);
  bar.append(brandBox);

  const list = menu ? menu.querySelector('ul') : null;
  if (list) {
    const menuBox = wrap(list, 'main-nav');
    copyTextOptions(menu, menuBox);
    [...list.querySelectorAll(':scope > li')].forEach((li, i) => buildMega(li, i, nav));
    bar.append(menuBox);
  }

  const toolsBox = wrap(null, 'nav-tools');
  const toolPs = tools ? [...tools.querySelectorAll('p')] : [];
  const login = toolPs.length ? toolPs[toolPs.length - 1] : null;
  toolPs.forEach((p) => {
    if (p === login) return;
    if (p.querySelector('img')) {
      const lang = wrap(p, 'lang-btn');
      lang.setAttribute('role', 'button');
      lang.tabIndex = 0;
      toolsBox.append(lang);
    } else {
      const ai = wrap(p, 'ai-search');
      ai.setAttribute('role', 'button');
      ai.tabIndex = 0;
      ai.append(icon('search'));
      toolsBox.append(ai);
    }
  });
  if (login) {
    const btn = wrap(login, 'login-btn');
    btn.setAttribute('role', 'button');
    btn.tabIndex = 0;
    toolsBox.append(btn);
  }
  toolsBox.append(control('Login', 'person', 'person-btn'));
  const burger = control('Open navigation', 'menu', 'menu-btn');
  burger.addEventListener('click', () => {
    const open = nav.getAttribute('aria-expanded') !== 'true';
    nav.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    document.body.style.overflowY = open && !isDesktop.matches ? 'hidden' : '';
    if (!open) closeMenus(nav);
  });
  toolsBox.append(burger);
  copyTextOptions(tools, toolsBox);
  bar.append(toolsBox);

  nav.append(bar);
  root.append(nav);
  block.append(root);

  // home (observed on live): the fixed header turns solid once the page scrolls (the notice
  // collapses), and the page switches from the dark to the light theme once the section
  // styled "theme-light" reaches the top of the viewport
  // an open mega menu shows the light header too (observed on live)
  if (document.body.classList.contains('home')) {
    const marker = document.querySelector('main .section.theme-light');
    const sync = () => {
      document.body.classList.toggle('is-scrolled', window.scrollY > 0);
      const light = (marker && marker.getBoundingClientRect().top < 0)
        || document.body.classList.contains('menu-open');
      document.body.classList.toggle('theme-light', light);
    };
    window.addEventListener('scroll', sync, { passive: true });
    nav.addEventListener('megatoggle', sync);
    sync();
  }

  document.addEventListener('click', (e) => {
    if (isDesktop.matches && !e.target.closest('header .main-nav > ul > li')) closeMenus(nav);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = nav.querySelector('.main-nav > ul > li.is-open');
    if (!open) return;
    closeMenus(nav);
    open.querySelector('.menu-label').focus();
  });
  isDesktop.addEventListener('change', () => closeMenus(nav));
}
