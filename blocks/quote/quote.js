/**
 * quote — pull quote with attribution (Saudia replica, press release body;
 * live: blockquote.saudia-article-quote > p… + cite).
 *
 * Rows (xwalk model `quote`):
 *   1. quotation    one or more paragraphs
 *   2. attribution  the speaker line (optional)
 *
 * Both cells are reused (their editor instrumentation stays in place): the quotation cell sits
 * in the <blockquote>, followed by the attribution cell.
 * @param {Element} block The quote block element
 */
export default function decorate(block) {
  const [quotation, attribution] = [...block.children].map((row) => row.firstElementChild || row);
  const quote = document.createElement('blockquote');
  if (quotation) {
    quotation.classList.add('quote__text');
    quote.append(quotation);
  }
  if (attribution && attribution.textContent.trim()) {
    // a plain cell, not a <footer>: the page's footer loader claims the first <footer> it finds
    attribution.classList.add('quote__by');
    quote.append(attribution);
  }
  block.replaceChildren(quote);
}
