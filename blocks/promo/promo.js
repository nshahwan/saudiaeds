/**
 * promo — rounded image banner with a heading and a dark CTA (Saudia replica, home;
 * live: app-jss-image-link-list .image--teaser banners).
 *
 * Rows (xwalk model `promo`):
 *   1. image        desktop rendition (<picture>)
 *   2. mobileImage  mobile rendition (<picture>, optional — desktop image is used when empty)
 *   3. text         <h2> · optional <p> description · <p> CTA link (button-formatted)
 * Variant `bottom`: text sits at the bottom of the banner instead of centred / top.
 *
 * Authored pictures and text are MOVED into the media/content slots (EW1).
 * @param {Element} block The promo block element
 */
export default function decorate(block) {
  const [desktop, mobile] = [...block.querySelectorAll('picture')];
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  const textCell = heading ? heading.parentElement : block.children[2]?.firstElementChild;

  const media = document.createElement('div');
  media.className = 'promo__media';
  [[desktop, mobile ? 'promo__pic--desktop' : ''], [mobile, 'promo__pic--mobile']].forEach(([pic, cls]) => {
    if (!pic) return;
    const slot = document.createElement('div');
    slot.className = `promo__pic ${cls}`.trim();
    slot.append(pic);
    media.append(slot);
  });

  // the text cell itself is the content slot (keeps its editor instrumentation)
  const content = textCell || document.createElement('div');
  content.classList.add('promo__content');
  block.replaceChildren(media, content);
}
