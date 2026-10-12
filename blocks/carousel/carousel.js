/**
 * carousel — home hero carousel (Saudia replica, home template; live: .custom-carousel swiper).
 *
 * Rows (xwalk item model `slide`), one per slide:
 *   1. image        desktop rendition (<picture>)
 *   2. mobileImage  mobile rendition (<picture>, optional — desktop image is used when empty)
 *   3. text         title (<h1> on the first slide — the page heading — <h2> on the others)
 *                   · optional <p> description · <p> CTA link (button-formatted)
 *
 * Behaviour observed on live: the first slide is active, autoplay advances every 5 s,
 * prev / next / pause controls (prev / next desktop only) and one progress bar per slide.
 * Authored pictures and text are MOVED into the slide layout (EW1); generated controls carry
 * no text, only aria-labels.
 * @param {Element} block The carousel block element
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

const INTERVAL = 5000;

function el(tag, className, ...kids) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  e.append(...kids.filter(Boolean));
  return e;
}

function control(label, iconName, className) {
  const b = el('button', className, el('span', `ico ico-${iconName}`));
  b.type = 'button';
  b.setAttribute('aria-label', label);
  b.querySelector('.ico').setAttribute('aria-hidden', 'true');
  return b;
}

export default function decorate(block) {
  const rows = [...block.children];
  const slides = rows.map((row, i) => {
    const pictures = [...row.querySelectorAll('picture')];
    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    const textCell = heading ? heading.parentElement : row.children[2];
    const [desktop, mobile] = pictures;

    const media = el('div', 'carousel__media');
    if (desktop) media.append(el('div', mobile ? 'carousel__pic carousel__pic--desktop' : 'carousel__pic', desktop));
    if (mobile) media.append(el('div', 'carousel__pic carousel__pic--mobile', mobile));
    // the text cell itself is the content slot (keeps its editor instrumentation)
    const content = textCell || el('div');
    content.classList.add('carousel__content');

    const slide = el('div', `carousel__slide${i === 0 ? ' is-active' : ''}`, media, content);
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${i + 1} of ${rows.length}`);
    moveInstrumentation(row, slide);
    return slide;
  });

  // LCP: the first slide's visible rendition loads eagerly
  const first = slides[0];
  if (first) {
    const pics = first.querySelectorAll('picture');
    const visible = pics.length > 1 && !window.matchMedia('(min-width: 900px)').matches ? pics[1] : pics[0];
    const img = visible ? visible.querySelector('img') : null;
    if (img) {
      img.loading = 'eager';
      img.fetchPriority = 'high';
    }
  }

  const bars = slides.map((_, i) => el('span', i === 0 ? 'is-active' : ''));
  const barBox = el('div', 'carousel__bars', ...bars);
  barBox.setAttribute('aria-hidden', 'true');
  const prev = control('Previous slide', 'arrow_back', 'carousel__btn carousel__prev');
  const next = control('Next slide', 'arrow_forward', 'carousel__btn carousel__next');
  const pause = control('Pause', 'pause', 'carousel__btn carousel__pause');

  let index = 0;
  let timer = null;
  const show = (i) => {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('is-active', n === index));
    bars.forEach((b, n) => b.classList.toggle('is-active', n === index));
  };
  const play = () => { timer = setInterval(() => show(index + 1), INTERVAL); };
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  pause.addEventListener('click', () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
      pause.setAttribute('aria-label', 'Play');
    } else {
      play();
      pause.setAttribute('aria-label', 'Pause');
    }
  });

  block.setAttribute('aria-roledescription', 'carousel');
  block.replaceChildren(el('div', 'carousel__track', ...slides), el('div', 'carousel__controls', barBox, prev, next, pause));
  // `carousel:show` (detail = slide index) jumps to a slide, e.g. to reset for a capture
  block.addEventListener('carousel:show', (e) => show(Number(e.detail) || 0));
  if (slides.length > 1) play();
}
