/**
 * accordion — FAQ panels (Saudia replica). Single-open, first panel open at rest
 * (observed on the live page: opening a panel closes the others).
 *
 * Rows (xwalk item model `accordion-item`), one per question:
 *   cell 1  summary — the question
 *   cell 2  text    — the answer (richtext)
 *
 * The question cell becomes the label inside a div[role=button] (a <button> cannot host the
 * Experience Workspace editor — EW7) and the answer cell becomes the panel; both cells are
 * reused, and the row's editor instrumentation moves to the item, so every item and field
 * stays editable in Universal Editor.
 * @param {Element} block The accordion block element
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
  const items = [...block.children].map((row, i) => {
    const [qCell, aCell] = row.children;
    const item = document.createElement('div');
    item.className = 'faq__item';
    moveInstrumentation(row, item);
    const head = document.createElement('div');
    head.className = 'faq__head';
    head.setAttribute('role', 'button');
    head.tabIndex = 0;
    const id = `faq-${Math.random().toString(36).slice(2, 8)}-${i}`;
    head.setAttribute('aria-controls', id);
    const q = qCell || document.createElement('div');
    q.classList.add('faq__q');
    const btn = document.createElement('span');
    btn.className = 'faq__btn';
    btn.setAttribute('aria-hidden', 'true');
    head.append(q, btn);
    const panel = aCell || document.createElement('div');
    panel.classList.add('faq__a');
    panel.id = id;
    panel.setAttribute('role', 'region');
    item.append(head, panel);
    return item;
  });

  const setOpen = (item, open) => {
    item.classList.toggle('is-open', open);
    item.querySelector('.faq__head').setAttribute('aria-expanded', String(open));
  };
  items.forEach((item, i) => setOpen(item, i === 0));

  block.replaceChildren(...items);
  block.addEventListener('click', (e) => {
    const head = e.target.closest('.faq__head');
    if (!head) return;
    const item = head.parentElement;
    const open = !item.classList.contains('is-open');
    items.forEach((other) => setOpen(other, false));
    setOpen(item, open);
  });
  block.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('faq__head')) {
      e.preventDefault();
      e.target.click();
    }
  });
}
