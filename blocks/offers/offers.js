/**
 * offers — "Exclusive Offers for You" tiles (Saudia replica, home; live: .offerforyou-content).
 * Desktop grid: a wide lead tile, a tall tile, then the rest stacked in the third column.
 *
 * Rows (xwalk item model `offer`), one per tile:
 *   1. image        desktop rendition (<picture>)
 *   2. mobileImage  mobile rendition (<picture>, optional)
 *   3. text         <h3> title (linked: the link is the tile target, optional) · optional <p>
 *
 * Authored nodes are MOVED and the text cell is reused (EW1, editor instrumentation kept); an
 * authored link stays in place and a CSS stretched link makes the whole tile clickable.
 * The round arrow is decorative and generated (no text).
 * @param {Element} block The offers block element
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
  const tiles = [...block.children].map((row) => {
    const [desktop, mobile] = [...row.querySelectorAll('picture')];
    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    const textCell = heading ? heading.parentElement : row.lastElementChild;

    const tile = document.createElement('div');
    tile.className = 'offers__tile';
    moveInstrumentation(row, tile);

    const media = document.createElement('div');
    media.className = 'offers__media';
    [[desktop, mobile ? 'offers__pic--desktop' : ''], [mobile, 'offers__pic--mobile']].forEach(([pic, cls]) => {
      if (!pic) return;
      const slot = document.createElement('div');
      slot.className = `offers__pic ${cls}`.trim();
      slot.append(pic);
      media.append(slot);
    });

    // the text cell is reused as the text slot (keeps its editor instrumentation); an authored
    // link stays in place and is stretched over the whole tile by CSS
    const text = textCell || document.createElement('div');
    text.classList.add('offers__text');

    const go = document.createElement('span');
    go.className = 'offers__go';
    go.setAttribute('aria-hidden', 'true');
    tile.append(media, text, go);
    return tile;
  });
  block.replaceChildren(...tiles);
}
