/**
 * stories — editorial story list (Saudia replica, home "Exceptional experiences with Saudia";
 * live: app-jss-image-link-list news teasers). Sits beside the section's default content
 * (heading + intro) on desktop.
 *
 * Rows (xwalk item model `story`), one per story:
 *   1. image        desktop rendition (<picture>)
 *   2. mobileImage  mobile rendition (<picture>, optional)
 *   3. text         <h3> title · <p> summary · <p> link (link text = label, href = story target)
 *
 * Authored nodes are MOVED and the text cell is reused (EW1, editor instrumentation kept); the
 * link stays in its paragraph and a CSS stretched link makes the whole story clickable.
 * @param {Element} block The stories block element
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
  const list = document.createElement('ul');
  list.className = 'stories__list';
  [...block.children].forEach((row) => {
    const [desktop, mobile] = [...row.querySelectorAll('picture')];
    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    const textCell = heading ? heading.parentElement : row.lastElementChild;

    const item = document.createElement('li');
    moveInstrumentation(row, item);
    const story = document.createElement('div');
    story.className = 'stories__item';

    const media = document.createElement('div');
    media.className = 'stories__media';
    [[desktop, mobile ? 'stories__pic--desktop' : ''], [mobile, 'stories__pic--mobile']].forEach(([pic, cls]) => {
      if (!pic) return;
      const slot = document.createElement('div');
      slot.className = `stories__pic ${cls}`.trim();
      slot.append(pic);
      media.append(slot);
    });

    // the text cell is reused as the text slot (keeps its editor instrumentation); the authored
    // link stays in place and is stretched over the whole story by CSS
    const text = textCell || document.createElement('div');
    text.classList.add('stories__text');
    story.append(media, text);
    item.append(story);
    list.append(item);
  });
  block.replaceChildren(list);
}
