/**
 * cards — image cards with a gradient title overlay; the whole card is one link
 * (Saudia replica, Experience › classes of travel; .sa-fleet-* on the live page).
 *
 * Rows (xwalk block model `cards`, then item model `card`):
 *   the block's fields first, one cell each (set or empty), told apart by their content:
 *     folder  a folder picked in the editor (link or path): its pages become the cards
 *     count   how many cards to show (a whole number; empty: all)
 *   then one row per authored card:
 *     cell 1  image — <picture>
 *     cell 2  text  — <h3> card title · <p> description · <p> link
 *                     (link text = CTA label, href = card target)
 * With a folder, the block lists its pages (scripts/folder-pages.js, the cards-folder pattern of
 * waringme/eds-reusable-blocks: query index on the site, the folder's child pages on AEM author),
 * ordered by their Card order page property, then title: each card shows the page's Card title /
 * Card summary / Card link text / Image, falling back to its first heading, description and first
 * image, and links to the page. The authored cards are the fallback when the folder has no pages
 * yet or can't be read (they stay in the block, hidden, for the editor). Without a folder, cards
 * beyond the count stay in the block, hidden (still selectable in the editor).
 *
 * The row's editor instrumentation moves to the card; the text cell is reused as the content
 * slot (EW1) — its title is laid over the image by CSS, and the authored CTA link stays in
 * place, stretched over the whole card by CSS.
 * @param {Element} block The cards block element
 */

const LINK_TEXT = 'Find out more';

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

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** the block's field rows (one cell, no image or heading): folder and count */
function readSettings(rows) {
  const settings = { folder: '', count: 0, cells: [] };
  while (rows[0]?.children.length === 1 && !rows[0].querySelector('picture, h1, h2, h3, h4, h5, h6')) {
    const text = rows[0].textContent.trim();
    const link = rows[0].querySelector('a');
    if (link || text.startsWith('/')) settings.folder = link ? link.getAttribute('href') : text;
    else if (/^\d+$/.test(text)) settings.count = Number(text);
    else if (text) break; // not a setting
    settings.cells.push(rows.shift());
  }
  return settings;
}

/** an authored card from its row */
function authoredCard(row) {
  const picture = row.querySelector('picture');
  const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
  const textCell = heading ? heading.parentElement : row.lastElementChild;
  const link = textCell ? textCell.querySelector('a[href]') : null;
  const cta = link ? link.closest('p') : null;
  if (cta) cta.classList.add('cards__cta');

  const card = el('article', 'cards__card');
  moveInstrumentation(row, card);
  const media = el('div', 'cards__media');
  if (picture) media.append(picture);
  const content = textCell || el('div');
  content.classList.add('cards__content');
  card.append(media, content);
  return card;
}

/** a card for a page of the picked folder (texts set as text) */
function pageCard(entry, pages) {
  const card = el('article', 'cards__card');
  const media = el('div', 'cards__media');
  if (pages.usable(entry.image)) media.append(pages.picture(entry.image, '.cards__media'));
  const content = el('div', 'cards__content');
  content.append(el('h3', '', entry.cardTitle || entry.heading || pages.withoutSiteName(entry.title)));
  const summary = entry.cardSummary || entry.description;
  if (summary) content.append(el('p', '', summary));
  const a = el('a', '', entry.cardLinkText || LINK_TEXT);
  a.href = entry.href || entry.path;
  const cta = el('p', 'cards__cta');
  cta.append(a);
  content.append(cta);
  card.append(media, content);
  return card;
}

function message(text) {
  const p = el('p', 'cards__message', text);
  p.setAttribute('role', 'status');
  return p;
}

/**
 * the picked folder's pages as cards; [] when it has none (the authored cards then stay — in
 * the editor, a prompt when there are no authored cards either)
 */
async function folderCards(raw, count, block, authored) {
  // loaded only when a folder is picked: blocks without one have no dependencies
  const { default: folderPages } = await import('../../scripts/folder-pages.js');
  const pages = folderPages(() => window.edsReusableBlocks?.cardsFolder || {});
  const folder = pages.sitePath(raw);
  block.dataset.folder = folder;
  const entries = await pages.list(folder, { limit: count || 1000, order: 'card-order' });
  if (!entries.length && !authored && pages.authorRoot()) return [message(`No pages found in ${folder}.`)];
  return entries.map((entry) => pageCard(entry, pages));
}

export default async function decorate(block) {
  const rows = [...block.children];
  const settings = readSettings(rows);
  const cards = rows.map(authoredCard);
  settings.cells.forEach((cell) => { cell.hidden = true; });

  let listed = [];
  if (settings.folder) {
    try {
      listed = await folderCards(settings.folder, settings.count, block, cards.length);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('cards: could not load the folder listing', error);
      if (!cards.length) listed = [message('Could not load the page listing.')];
    }
  }
  if (listed.length) {
    // the folder's pages are shown; the authored cards stay, hidden, for the editor
    cards.forEach((card) => { card.hidden = true; });
  } else if (settings.count) {
    cards.forEach((card, i) => { if (i >= settings.count) card.hidden = true; });
  }
  // the field cells stay (hidden) so their editor instrumentation is kept
  block.replaceChildren(...listed, ...cards, ...settings.cells);
}
