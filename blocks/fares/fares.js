/**
 * fares — "Best fares from …" destination cards (Saudia replica, home; live: .featuredlist).
 * Captured fares are authored content; live fares come from the fares API (dynamics D-14).
 *
 * Rows (xwalk item model `fare`), one per card:
 *   cell 1  image — <picture>
 *   cell 2  text  — <h3> city (linked: the link is the card target) · <p> price · <p> trip line
 *
 * Authored nodes are MOVED and the text cell is reused (EW1, editor instrumentation kept); the
 * city link stays in the heading and a CSS stretched link makes the whole card clickable.
 * @param {Element} block The fares block element
 */

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

export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'fares__list';
  [...block.children].forEach((row) => {
    const picture = row.querySelector('picture');
    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    // the text cell is reused as the content slot (keeps its editor instrumentation); the
    // authored city link stays in place and is stretched over the whole card by CSS
    const textCell = heading ? heading.parentElement : row.lastElementChild;

    const item = document.createElement('li');
    moveInstrumentation(row, item);
    const card = document.createElement('div');
    card.className = 'fares__card';
    const media = document.createElement('div');
    media.className = 'fares__media';
    if (picture) media.append(picture);
    const content = textCell || document.createElement('div');
    content.classList.add('fares__content');
    card.append(media, content);
    item.append(card);
    list.append(item);
  });
  block.replaceChildren(list);
}
