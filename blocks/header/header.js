import { getChromePath } from '../../scripts/scripts.js';
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
 *   menu      a <ul> of top-level menu labels (mega menus: dynamics D-02, not yet wired)
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
  bar.append(brandBox);

  const list = menu ? menu.querySelector('ul') : null;
  if (list) {
    const menuBox = wrap(list, 'main-nav');
    list.querySelectorAll(':scope > li').forEach((li) => li.setAttribute('role', 'menuitem'));
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
  });
  toolsBox.append(burger);
  bar.append(toolsBox);

  nav.append(bar);
  root.append(nav);
  block.append(root);

  // home (observed on live): the fixed header turns solid once the page scrolls (the notice
  // collapses), and the page switches from the dark to the light theme once the section
  // styled "theme-light" reaches the top of the viewport
  if (document.body.classList.contains('home')) {
    const marker = document.querySelector('main .section.theme-light');
    const sync = () => {
      document.body.classList.toggle('is-scrolled', window.scrollY > 0);
      if (marker) document.body.classList.toggle('theme-light', marker.getBoundingClientRect().top < 0);
    };
    window.addEventListener('scroll', sync, { passive: true });
    sync();
  }
}
