/**
 * quote — pull quote in a press release body (Saudia replica, live "saudia-article-quote";
 * approved prototype stardust/prototypes/press-release-proposed.html).
 *
 * Rows (xwalk model `quote`), one cell each:
 *   1. quotation    <p>(s) of the quoted text
 *   2. attribution  <p> speaker line (e.g. "— Name, Role")
 * Rendered as <figure><blockquote>quotation</blockquote><figcaption>attribution</figcaption>.
 * Never a <footer>: the page's footer loader claims the first <footer> in the document.
 *
 * Each field cell is reused as the element holding its content (EW1, editor instrumentation
 * kept), moved into its semantic wrapper; the opening quote mark is CSS only.
 * @param {Element} block The quote block element
 */
export default function decorate(block) {
  const [quotation, attribution] = [...block.querySelectorAll(':scope > div > div')];
  const figure = document.createElement('figure');

  const blockquote = document.createElement('blockquote');
  if (quotation) {
    quotation.classList.add('quote__text');
    blockquote.append(quotation);
  }
  figure.append(blockquote);

  if (attribution?.textContent.trim()) {
    const caption = document.createElement('figcaption');
    attribution.classList.add('quote__attribution');
    caption.append(attribution);
    figure.append(caption);
  }
  block.replaceChildren(figure);
}
