// Saudia replica — shared behaviour, implemented only where the live site was observed
// to react (stardust/replica/motion/observed.json): single-open FAQ accordion and
// mobile footer groups. Initial state is fully static (CSS).
document.addEventListener('click', (e) => {
  const head = e.target.closest('.faq__head');
  if (head) {
    const item = head.closest('.faq__item');
    const open = !item.classList.contains('is-open');
    item.parentElement.querySelectorAll('.faq__item.is-open').forEach((other) => {
      other.classList.remove('is-open');
      other.querySelector('.faq__head').setAttribute('aria-expanded', 'false');
    });
    item.classList.toggle('is-open', open);
    head.setAttribute('aria-expanded', String(open));
    return;
  }
  const group = e.target.closest('.footer-acc__item');
  if (group && window.matchMedia('(max-width: 899px)').matches) group.classList.toggle('is-open');
});

// Home (observed on live, gates/home-*): the fixed header turns solid once the page scrolls
// (notice collapses), and the page switches from the dark to the light theme once the theme
// marker has scrolled above the viewport. The hero carousel autoplays (5 slides) with
// prev / next / pause controls and progress bars.
if (document.body.classList.contains('page-home')) {
  const marker = document.querySelector('.theme-switch');
  const sync = () => {
    document.body.classList.toggle('is-scrolled', window.scrollY > 0);
    if (marker) document.body.classList.toggle('theme-light', marker.getBoundingClientRect().top < 0);
  };
  window.addEventListener('scroll', sync, { passive: true });
  sync();

  const hero = document.querySelector('.home-hero');
  if (hero) {
    const slides = [...hero.querySelectorAll('.home-hero__slide')];
    const bars = [...hero.querySelectorAll('.home-hero__bars span')];
    let index = 0;
    let timer = null;
    const show = (i) => {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, n) => s.classList.toggle('is-active', n === index));
      bars.forEach((b, n) => b.classList.toggle('is-active', n === index));
    };
    hero.carouselShow = show; // capture hook, the counterpart of live's swiper.slideToLoop(0)
    const play = () => { timer = setInterval(() => show(index + 1), 5000); };
    const pause = hero.querySelector('.home-hero__pause');
    hero.querySelector('.home-hero__prev').addEventListener('click', () => show(index - 1));
    hero.querySelector('.home-hero__next').addEventListener('click', () => show(index + 1));
    pause.addEventListener('click', () => {
      if (timer) { clearInterval(timer); timer = null; pause.setAttribute('aria-label', 'Play'); } else { play(); pause.setAttribute('aria-label', 'Pause'); }
    });
    play();
  }
}
