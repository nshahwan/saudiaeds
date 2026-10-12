/**
 * checklist — icon-led feature list (Saudia replica, Book & Manage product intro).
 *
 * Rows (xwalk item model `checklist-item`), one per item, one richtext cell:
 *   <h3> item title, then the body (<p> or a <ul>, nested lists allowed)
 *
 * The row's editor instrumentation moves to the list item and the cell is reused as the item
 * text (EW1); the check disc is generated beside it (decorative, no text).
 * @param {Element} block The checklist block element
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
  const list = document.createElement('ul');
  list.className = 'checklist__list';
  [...block.children].forEach((row) => {
    const cell = row.firstElementChild;
    if (!cell) return;
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    const disc = document.createElement('span');
    disc.className = 'checklist__icon';
    disc.setAttribute('aria-hidden', 'true');
    disc.append(Object.assign(document.createElement('span'), { className: 'ico ico-done' }));
    cell.classList.add('checklist__body');
    if (cell.querySelector('ul, ol')) cell.classList.add('has-list');
    li.append(disc, cell);
    list.append(li);
  });
  block.replaceChildren(list);
}
