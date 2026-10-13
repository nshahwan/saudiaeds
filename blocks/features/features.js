/**
 * features — alternating image + text rows (Saudia replica, Explore destination itinerary;
 * live: .saudia-itinerary-box > .saudia-feature-row, every second row `.reverse`).
 *
 * Rows (xwalk item model `feature`), one per feature:
 *   1. image  <picture>
 *   2. text   rich text (live: one <h4>)
 *
 * The alternation is positional (CSS :nth-child), so authors only reorder items.
 * The row's editor instrumentation moves to the row element and both cells are reused as the
 * image and text slots (EW1).
 * @param {Element} block The features block element
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
  const rows = [...block.children].map((row) => {
    const item = document.createElement('div');
    item.className = 'features__row';
    moveInstrumentation(row, item);

    // both cells are reused as the slots (their editor instrumentation stays in place)
    const cells = [...row.children];
    const media = cells.find((c) => c.querySelector('picture')) || document.createElement('div');
    media.classList.add('features__media');
    const text = cells.find((c) => c !== media) || document.createElement('div');
    text.classList.add('features__text');

    item.append(text, media);
    return item;
  });
  block.replaceChildren(...rows);
}
