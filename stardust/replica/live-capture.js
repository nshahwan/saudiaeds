// Live-side capture for the Saudia replica, run inside the interactive browser
// session (the only channel that clears Saudia's Imperva challenge). It mirrors
// stitch-shot.mjs step for step (consent click, pointer park, settle scroll,
// animation/video/timer freeze, slick reset, chunked viewport screenshots) so the
// live and prototype captures stay symmetric. Chunks are stitched locally by
// stitch-chunks.mjs. Also dumps the rendered DOM and per-element computed styles.
// Paste the function body into the browser's run_code with URL/SLUG/W set.
async (page) => {
  const URL_ = '__URL__';
  const SLUG = '__SLUG__';
  const W = __W__;
  const VH = 900;
  const DIR = `/tmp/playwright/live/${SLUG}-${W}`;
  const save = async (path, text, type) => {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.evaluate(([t, ty]) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([t], { type: ty }));
        a.download = 'd';
        document.body.appendChild(a); a.click(); a.remove();
      }, [text, type]),
    ]);
    await dl.saveAs(path);
  };
  const consent = async () => {
    const b = page.getByRole('button', { name: /Yes, I accept/i }).first();
    if (await b.count() && await b.isVisible()) { await b.click(); await page.waitForTimeout(1500); return true; }
    return false;
  };
  await page.setViewportSize({ width: W, height: VH });
  const resp = await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  const challenged = await page.evaluate(() => !!document.querySelector('iframe[src*="_Incapsula_Resource"]'));
  if (challenged) { await page.goto('about:blank'); return JSON.stringify({ error: 'CHALLENGED', status: resp && resp.status() }); }
  const c1 = await consent();
  await page.mouse.move(0, VH - 1);
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 220)); }
  });
  await page.waitForTimeout(3000);
  const c2 = await consent();
  await page.mouse.move(0, VH - 1);
  await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important;}html{scroll-behavior:auto!important}' });
  await page.evaluate(async () => {
    const vids = [...document.querySelectorAll('video')];
    await Promise.all(vids.map((v) => new Promise((res) => { try { v.pause(); v.removeAttribute('autoplay'); if (v.readyState >= 1) v.currentTime = 0; setTimeout(res, 300); } catch { res(); } })));
    let id = window.setTimeout(() => {}, 0); while (id-- > 0) { window.clearTimeout(id); window.clearInterval(id); }
    const dot = document.querySelector('.slick-dots li:first-child button');
    if (dot) { dot.click(); let j = window.setTimeout(() => {}, 0); while (j-- > 0) { window.clearTimeout(j); window.clearInterval(j); } }
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  const failedFonts = await page.evaluate(async () => { await document.fonts.ready; return [...new Set([...document.fonts].filter((f) => f.status === 'error').map((f) => f.family))]; });
  const totalH = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
  const chunks = [];
  for (let y = 0; y < totalH; y += VH) {
    const target = Math.max(0, Math.min(y, totalH - VH));
    await page.evaluate((ty) => window.scrollTo(0, ty), target);
    await page.waitForTimeout(450);
    await page.evaluate(async () => {
      const t0 = Date.now();
      const pend = () => [...document.querySelectorAll('img')].some((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 10 && (!i.complete || i.naturalWidth === 0); });
      while (pend() && Date.now() - t0 < 3000) await new Promise((r) => setTimeout(r, 150));
    });
    const actualY = await page.evaluate(() => window.scrollY);
    const file = `${DIR}/chunk-${String(chunks.length).padStart(2, '0')}.png`;
    await page.screenshot({ path: file });
    chunks.push({ y: actualY, file });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const dump = await page.evaluate(() => {
    const KEYS = ['display', 'position', 'top', 'left', 'z-index', 'width', 'height', 'max-width', 'min-height', 'margin', 'padding', 'gap', 'flex-direction', 'justify-content', 'align-items', 'grid-template-columns', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'text-decoration-line', 'color', 'background-color', 'background-image', 'background-size', 'background-position', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius', 'box-shadow', 'opacity', 'object-fit', 'object-position', 'overflow', 'white-space', 'text-wrap', '-webkit-font-smoothing', 'text-rendering', 'filter', 'transform'];
    const short = (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 4).join('.')}` : '');
    const pathOf = (el) => { const p = []; let e = el; let n = 0; while (e && e !== document.body && n < 7) { p.unshift(short(e)); e = e.parentElement; n += 1; } return p.join(' > '); };
    const out = [];
    const all = document.body.querySelectorAll('*');
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const ownText = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
      const tag = el.tagName.toLowerCase();
      const painted = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || cs.borderTopWidth !== '0px' || cs.borderBottomWidth !== '0px' || cs.boxShadow !== 'none';
      const media = ['img', 'svg', 'picture', 'video', 'input', 'button', 'a', 'iframe', 'select', 'textarea'].includes(tag);
      const structural = ['header', 'footer', 'main', 'section', 'nav', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'].includes(tag) || /^app-|^sc-/.test(tag);
      if (!ownText && !painted && !media && !structural) continue;
      const s = {};
      for (const k of KEYS) s[k] = cs.getPropertyValue(k);
      if (s['background-image'] && s['background-image'].length > 400) s['background-image'] = s['background-image'].slice(0, 400);
      const o = { path: pathOf(el), tag, x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), s };
      if (ownText) o.text = ownText.slice(0, 160);
      if (tag === 'img') { o.src = el.currentSrc || el.src; o.alt = el.alt; o.nat = [el.naturalWidth, el.naturalHeight]; }
      if (tag === 'a') o.href = el.getAttribute('href');
      const before = getComputedStyle(el, '::before'); const after = getComputedStyle(el, '::after');
      if (before.content && before.content !== 'none' && before.content !== 'normal') o.before = { content: before.content.slice(0, 60), font: before.fontFamily, size: before.fontSize, color: before.color, bg: before.backgroundColor, bgi: before.backgroundImage.slice(0, 200), w: before.width, h: before.height };
      if (after.content && after.content !== 'none' && after.content !== 'normal') o.after = { content: after.content.slice(0, 60), font: after.fontFamily, size: after.fontSize, color: after.color, bg: after.backgroundColor, bgi: after.backgroundImage.slice(0, 200), w: after.width, h: after.height };
      out.push(o);
    }
    const fonts = [...document.fonts].map((f) => ({ family: f.family, weight: f.weight, style: f.style, status: f.status }));
    const sheets = [...document.styleSheets].map((ss) => ss.href).filter(Boolean);
    return { url: location.href, title: document.title, lang: document.documentElement.lang, dir: document.documentElement.dir, metaDesc: document.querySelector('meta[name="description"]')?.content || null, elements: out, fonts, sheets };
  });
  const html = await page.evaluate(() => `<!doctype html>\n${document.documentElement.outerHTML}`);
  await save(`${DIR}/dom.html`, html, 'text/html');
  await save(`${DIR}/styles.json`, JSON.stringify(dump), 'application/json');
  await save(`${DIR}/meta.json`, JSON.stringify({ url: URL_, finalUrl: dump.url, width: W, vh: VH, totalH, chunks, failedFonts, consent: [c1, c2], status: resp && resp.status(), capturedAt: new Date().toISOString(), channel: 'interactive-browser-session' }), 'application/json');
  await page.goto('about:blank');
  return JSON.stringify({ ok: true, finalUrl: dump.url, totalH, chunks: chunks.length, elements: dump.elements.length, failedFonts, consent: [c1, c2] });
}
