/**
 * hero — full-bleed campaign banner (Saudia replica, template-slotted).
 *
 * Rows (xwalk model `hero`):
 *   1. image        desktop rendition (<picture>)
 *   2. mobileImage  mobile rendition (<picture>, optional — desktop image is used when empty)
 *   3. text         headline (<h1>; <h3> on the `banner` variant) + optional description <p>
 * Variant `banner`: the rounded in-copy image banner (destination pages), single image.
 *
 * Authored pictures are MOVED into the media slot; the text cell is reused as the content
 * slot (EW1, Universal Editor instrumentation kept).
 * @param {Element} block The hero block element
 */
export default function decorate(block) {
  const pictures = [...block.querySelectorAll('picture')];
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  // the text cell itself becomes the content slot, so its Universal Editor instrumentation
  // stays on the element that holds exactly the authored text
  const textCell = heading ? heading.parentElement : block.children[2]?.firstElementChild;

  const media = document.createElement('div');
  media.className = 'hero__media';
  const [desktop, mobile] = pictures;
  const slot = (pic, className) => {
    const w = document.createElement('div');
    w.className = className;
    w.append(pic);
    return w;
  };
  if (desktop) media.append(slot(desktop, mobile ? 'hero__pic hero__pic--desktop' : 'hero__pic'));
  if (mobile) media.append(slot(mobile, 'hero__pic hero__pic--mobile'));

  const content = textCell || document.createElement('div');
  content.classList.add('hero__content');

  // LCP: eager-load the rendition that is actually visible (the first section is the hero)
  if (!block.classList.contains('banner')) {
    const visible = mobile && !window.matchMedia('(min-width: 900px)').matches ? mobile : desktop;
    const img = visible ? visible.querySelector('img') : null;
    if (img) {
      img.loading = 'eager';
      img.fetchPriority = 'high';
    }
  }

  block.replaceChildren(media, content);
}
