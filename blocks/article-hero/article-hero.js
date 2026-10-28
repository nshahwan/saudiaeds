/**
 * article-hero — press release header card: meta line, title and subtitle beside the image
 * (Saudia replica, About us › press release, live "saudia-modern-article"; approved prototype
 * stardust/prototypes/press-release-proposed.html).
 *
 * Rows (xwalk model `article-hero`), one cell each:
 *   1. image  <picture> (shown above the text on mobile, on the right on desktop)
 *   2. meta   one <p> per meta item (location, date): one line, separated by CSS
 *   3. text   <h1> title · optional <p> subtitle(s)
 * Cells are matched by content (picture / heading / the rest), so a missing field is fine.
 *
 * Each field cell is reused as the element holding its content (EW1, editor instrumentation
 * kept); the meta separators and the layout are CSS only.
 * @param {Element} block The article-hero block element
 */
export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const media = cells.find((cell) => cell.querySelector('picture, img'));
  const copy = cells.find((cell) => cell !== media && cell.querySelector('h1, h2, h3'));
  const meta = cells.find((cell) => cell !== media && cell !== copy && cell.textContent.trim());

  const text = document.createElement('div');
  text.className = 'article-hero__text';
  if (meta) {
    meta.classList.add('article-hero__meta');
    text.append(meta);
  }
  if (copy) {
    copy.classList.add('article-hero__copy');
    text.append(copy);
  }

  const slots = [text];
  if (media) {
    media.classList.add('article-hero__media');
    slots.push(media);
  }
  block.replaceChildren(...slots);
}
