/**
 * article-hero — press release lead: meta line, title, subtitle beside the lead image
 * (Saudia replica, About us › press release; live: .saudia-article-hero).
 *
 * Rows (xwalk model `article-hero`):
 *   1. image  <picture>
 *   2. meta   one paragraph per meta item (location, date), shown on one line with separators
 *   3. text   the <h1> title, then the subtitle paragraph(s)
 *
 * The meta and text cells are reused as they are (EW1) inside a generated copy column, so each
 * keeps its Universal Editor instrumentation and holds exactly its authored content.
 * @param {Element} block The article-hero block element
 */
export default function decorate(block) {
  const pic = block.querySelector('picture');
  const heading = block.querySelector('h1, h2');
  const cells = [...block.children].map((row) => row.firstElementChild).filter(Boolean);
  const text = heading ? heading.parentElement : cells[2];
  const meta = cells.find((c) => c !== text && !c.querySelector('picture'));

  const media = document.createElement('div');
  media.className = 'article-hero__media';
  if (pic) media.append(pic);

  const copy = document.createElement('div');
  copy.className = 'article-hero__copy';
  if (meta && meta.textContent.trim()) {
    meta.classList.add('article-hero__meta');
    copy.append(meta);
  }
  if (text) {
    text.classList.add('article-hero__text');
    if (heading) heading.classList.add('article-hero__title');
    [...text.children].filter((n) => n !== heading).forEach((n) => n.classList.add('article-hero__subtitle'));
    copy.append(text);
  }

  block.replaceChildren(copy, media);
}
