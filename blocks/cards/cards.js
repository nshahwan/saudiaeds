/**
 * cards — image cards with a gradient title overlay; the whole card is one link
 * (Saudia replica, Experience › classes of travel; .sa-fleet-* on the live page).
 *
 * Rows (xwalk item model `card`), one per card:
 *   cell 1  image — <picture>
 *   cell 2  text  — <h3> card title · <p> description · <p> link
 *                   (link text = CTA label, href = card target)
 *
 * The row's editor instrumentation moves to the card; the text cell is reused as the content
 * slot (EW1) — its title is laid over the image by CSS, and the authored CTA link stays in
 * place, stretched over the whole card by CSS.
 * @param {Element} block The cards block element
 */

// carry the Universal Editor instrumentation of an authored row over to the element that
// replaces it (same as moveInstrumentation in scripts.js, inlined so the block has no imports)
function moveInstrumentation(from, to) {
  [...from.attributes]
    .filter(({ name }) => name.startsWith('data-aue-') || name.startsWith('data-richtext-'))
    .forEach(({ name, value }) => {
      to.setAttribute(name, value);
      from.removeAttribute(name);
    });
}

export default function decorate(block) {
  const cards = [...block.children].map((row) => {
    const picture = row.querySelector('picture');
    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    const textCell = heading ? heading.parentElement : row.lastElementChild;
    const link = textCell ? textCell.querySelector('a[href]') : null;
    const cta = link ? link.closest('p') : null;
    if (cta) cta.classList.add('cards__cta');

    const card = document.createElement('article');
    card.className = 'cards__card';
    moveInstrumentation(row, card);
    const media = document.createElement('div');
    media.className = 'cards__media';
    if (picture) media.append(picture);
    const content = textCell || document.createElement('div');
    content.classList.add('cards__content');
    card.append(media, content);
    return card;
  });
  block.replaceChildren(...cards);
}
