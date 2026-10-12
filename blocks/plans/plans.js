/**
 * plans — subscription plan cards (Saudia replica, Book & Manage product).
 *
 * Rows (xwalk item model `plan-item`), one per plan, three richtext cells:
 *   1. head       <h3> plan name · <p> audience line
 *   2. quarterly  <p> label · <p> detail · 1–2 <p> pill lines
 *                 (2 lines = "Subscriber +" / "N beneficiaries")
 *   3. onetime    same shape as quarterly
 *
 * The row's editor instrumentation moves to the card and the three cells are reused as the
 * head and the two payment groups; only classes are added to the authored paragraphs (EW1),
 * and the icons are CSS masks (fixed brand assets from /icons, no text).
 * @param {Element} block The plans block element
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

function el(tag, className, ...kids) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  e.append(...kids.filter(Boolean));
  return e;
}

function group(cell, kind) {
  if (!cell) return null;
  cell.classList.add('plan__group', `plan__group--${kind}`);
  const [label, detail, ...pill] = [...cell.querySelectorAll(':scope > p')];
  if (label) label.classList.add('plan__label');
  if (detail) detail.classList.add('plan__detail');
  pill.forEach((p, i) => p.classList.add('plan__pill', i === 0 ? 'plan__pill--who' : 'plan__pill--more'));
  if (pill.length === 1) pill[0].classList.add('plan__pill--only');
  return cell;
}

export default function decorate(block) {
  const cards = [...block.children].map((row) => {
    const [head, quarterly, onetime] = row.children;
    if (head) head.classList.add('plan__head');
    const card = el('div', 'plan', head, el('div', 'plan__body', group(quarterly, 'quarterly'), group(onetime, 'onetime')));
    moveInstrumentation(row, card);
    return card;
  });
  block.replaceChildren(...cards);
}
