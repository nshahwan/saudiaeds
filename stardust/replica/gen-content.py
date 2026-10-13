"""Generate EDS (xwalk) content pages + chrome fragments from the approved replica prototypes.

Writes content/<path>.plain.html (enveloped <body><header/><main>…</main><footer/></body>; the
platform handoff script strips the envelope afterwards). Text is lifted verbatim from the gated
prototypes; block cells carry <!-- field:x --> hints matching the blocks' _<block>.json models.
"""
import re

ROOT = '/backups/nshahwan/saudiaeds/repo/'
PROTO = ROOT + 'stardust/prototypes/'
MEDIA = '/stardust/prototypes/assets/media/'
LIVE = 'https://www.saudia.com'
MIGRATED = {
    '/en-SA/explore/saudia-new-destinations-2026/fly-to-athens': '/en-sa/explore/saudia-new-destinations-2026/fly-to-athens',
    '/en-SA/book-and-manage/book/flight-pass': '/en-sa/book-and-manage/book/flight-pass',
    '/en-SA/plan/on-board/classes-of-travel': '/en-sa/plan/on-board/classes-of-travel',
    '/en-SA/experience/on-board/classes-of-travel': '/en-sa/plan/on-board/classes-of-travel',
}


def read(name):
    return open(PROTO + name, encoding='utf-8').read()


def between(s, start, end):
    i = s.index(start) + len(start)
    return s[i:s.index(end, i)]


def fix_links(html):
    """Root-relative live links → migrated path or absolute live URL; media → local paths."""
    def href(m):
        url = m.group(1)
        if url.startswith('/'):
            url = MIGRATED.get(url, LIVE + url)
        return f'href="{url}"'
    html = re.sub(r'href="([^"]*)"', href, html)
    html = html.replace('src="assets/media/', f'src="{MEDIA}')
    return html


def strip_classes(html):
    return re.sub(r'\s(class|aria-hidden|role|aria-label|width|height|type|id|aria-controls|aria-expanded)="[^"]*"', '', html)


def block(name, rows):
    """rows: list of rows; each row a list of (field, html) cells (field None = no hint)."""
    out = [f'<div class="{name}">']
    for row in rows:
        out.append('  <div>')
        for field, cell in row:
            hint = f'<!-- field:{field} -->' if field and cell.strip() else ''
            out.append(f'    <div>{hint}{cell}</div>')
        out.append('  </div>')
    out.append('</div>')
    return '\n'.join(out)


def section(*parts, style=None):
    inner = '\n'.join(parts)
    if style:
        inner += f'\n<div class="section-metadata"><div><div>style</div><div>{style}</div></div></div>'
    return f'<div>\n{inner}\n</div>'


def metadata(rows):
    cells = ''.join(f'<div><div>{k}</div><div>{v}</div></div>' for k, v in rows)
    return f'<div>\n<div class="metadata">{cells}</div>\n</div>'


def page(path, sections):
    html = '<body>\n<header></header>\n<main>\n' + '\n'.join(sections) + '\n</main>\n<footer></footer>\n</body>\n'
    import os
    os.makedirs(os.path.dirname(ROOT + 'content/' + path + '.plain.html'), exist_ok=True)
    open(ROOT + 'content/' + path + '.plain.html', 'w', encoding='utf-8').write(html)
    print('wrote', path)


def img(file, alt):
    return f'<picture><img src="{MEDIA}{file}" alt="{alt}"></picture>'


# ---------------------------------------------------------------- Explore: fly to Athens
ath = read('explore-destination-proposed.html')
copy = between(ath, '<div class="destination-copy__inner">', '<div class="saudia-banner">')
copy = strip_classes(copy).strip()
itin = strip_classes(between(ath, '<div class="itinerary">', '\n        </div>')).strip()
faqs = re.findall(r'<span class="faq__q">(.*?)</span>.*?<div class="faq__a"[^>]*>(.*?)</div>', ath, re.S)
promo = re.search(r'<a class="booking__promo" href="([^"]*)">([^<]*)<', ath)
page('en-sa/explore/saudia-new-destinations-2026/fly-to-athens', [
    metadata([
        ('Title', 'Fly to Athens'),
        ('Description', 'Fly to Athens with Saudia and explore a city where ancient history meets modern charm, with comfortable flights and exceptional service every step of the way.'),
        ('Template', 'destination'), ('Theme', 'beige'), ('nav', '/nav-home'), ('footer', '/footer-saudia'),
    ]),
    section(block('hero', [
        [('image', img('Saudia_Athens_1920X600_EN-5e2dbb.jpg', ''))],
        [('mobileImage', img('Saudia_Athens_1270x1200_EN-df08ce.jpg', ''))],
        [('text', '<h1>Your Summer in Athens</h1>')],
    ])),
    section(block('booking', [
        [('tabs', '<ul><li>Book</li><li>Check-in</li><li>Flight schedule</li><li>Flight status</li><li>Flight status</li><li>Manage</li></ul>'
                  f'<p><a href="{promo.group(1)}">{promo.group(2)}</a></p>')],
        [('trip', '<p>Round trip</p><p>One way</p><p>Book with Miles</p>')],
        [('route', '<p>From</p><p>Jeddah (JED)</p><p>To</p>')],
        [('info', fix_links('<p>Read more about the latest travel requirements for your next destination</p><p><a href="/en-SA/plan/before-you-fly/travel-requirements">Learn more</a></p>'))],
    ])),
    section(fix_links(copy), style='narrow'),
    section(block('hero banner', [
        [('image', img('ATH-01134d.jpg', ''))],
        [(None, '')],
        [('text', '<h3>Explore Athens: Where Ancient Heritage Meets Modern Ambition</h3>')],
    ]), style='narrow'),
    section(fix_links(itin), style='itinerary'),
    section('<h2>FAQs</h2>', block('accordion', [
        [('summary', q.strip()), ('text', fix_links(a.strip()))] for q, a in faqs
    ]), style='faq'),
])

# ---------------------------------------------------------------- Book & Manage: Flight Pass
fp = read('_main/book-manage-flight-pass.html')
intro = between(fp, '<div class="product-intro__copy">', '<!-- Live CTA')
intro = re.sub(r'</?span>', '', strip_classes(intro)).strip()
checklist_items = re.findall(r'<h3>(.*?)</h3>\s*<span class="checklist__body">(.*?)</span>\s*</li>', fp, re.S)
plans = fp.split('<div class="plan">')[1:]


def plan_cells(p):
    h3 = re.search(r'<h3>(.*?)</h3><p>(.*?)</p>', p)
    groups = re.findall(r'<p class="plan__label">.*?>([^<]*)</p>\s*<p class="plan__detail">(.*?)</p>\s*<p class="plan__pill">(.*?)</p>', p, re.S)

    def g(label, detail, pill):
        parts = [x.strip() for x in re.split(r'<img[^>]*>', pill) if x.strip()]
        return f'<p>{label}</p><p>{detail}</p>' + ''.join(f'<p>{x}</p>' for x in parts)
    return [('head', f'<h3>{h3.group(1)}</h3><p>{h3.group(2)}</p>'), ('quarterly', g(*groups[0])), ('onetime', g(*groups[1]))]


note = re.search(r'<p class="plans__note">(.*?)</p>', fp).group(1)
lead = re.search(r'<p class="plans__lead">(.*?)</p>', fp).group(1)
page('en-sa/book-and-manage/book/flight-pass', [
    metadata([
        ('Title', 'Saudia Annual Flight Pass: Fixed Fares &amp; Flexible Travel'),
        ('Description', 'Enjoy fixed fares and year-round freedom with the Saudia Flight Pass. Book flights at a set price with flexible payment options. Get your Flight Pass today.'),
        ('Template', 'product'), ('nav', '/nav-product'), ('footer', '/footer-saudia-product'),
    ]),
    section(block('hero', [
        [('image', img('Saudia_Flight-Subscription_Banner_web-en-a3012c.jpg', 'A Saudia promotional banner showing diverse travelers with luggage in front of vibrant destination images, set on a green dynamic background representing effortless and inspiring travel experiences.'))],
        [('mobileImage', img('Saudia_Flight-Subscription_Banner_mweb-en-02a475.jpg', 'A Saudia promotional banner showing diverse travelers with luggage in front of vibrant destination images, set on a green dynamic background representing effortless and inspiring travel experiences.'))],
        [('text', '<h1>Saudia Flight Pass</h1><p>Lock in your price. Fly flexibly. Save more.</p>')],
    ])),
    section(intro + '\n<p><strong><a href="https://flightpass.saudia.com/sv/subscriptions">Sign up now</a></strong></p>',
            block('checklist', [[('text', f'<h3>{t}</h3>' + (b.strip() if b.strip().startswith('<') else f'<p>{b.strip()}</p>'))] for t, b in checklist_items]),
            style='split'),
    section(f'<h2>Subscription Plans</h2>\n<p>{lead}</p>', block('plans', [plan_cells(p) for p in plans]), f'<p>{note}</p>', style='centered'),
])

# ---------------------------------------------------------------- Experience: Classes of Travel
cl = read('_main/experience-classes.html')
cards = re.findall(r'<a class="sa-fleet-card__link" href="([^"]*)".*?<img src="assets/media/([^"]*)" alt="([^"]*)">.*?<h4 class="sa-fleet-card__title">(.*?)</h4>.*?<p class="sa-fleet-card__desc">(.*?)</p>.*?<span class="sa-fleet-card__cta">(.*?)</span>', cl, re.S)
page('en-sa/plan/on-board/classes-of-travel', [
    metadata([
        ('Title', 'Classes of Travel and Cabin Experience | Saudia'),
        ('Description', 'Explore Saudia classes of travel including Guest, Business and First Class. Compare cabin features and onboard services. Choose your preferred class and fly with Saudia today.'),
        ('Template', 'listing'), ('nav', '/nav'), ('footer', '/footer-saudia-experience'),
    ]),
    section(block('hero', [
        [('image', img('classes-web-84d89d.jpg', "Interior view of a luxurious Saudia premium class cabin suite. The large in-flight entertainment screen prominently displays the 'BEYOND' interface with a welcome message in Arabic and English, set against a backdrop of AlUla's Elephant Rock. The elegant suite features modern seat controls, a secondary touchscreen remote, and a green amenity kit resting on the side console."))],
        [('mobileImage', img('classes-mweb-a7d69d.jpg', "Interior view of a luxurious Saudia premium class cabin suite. The large in-flight entertainment screen prominently displays the 'BEYOND' interface with a welcome message in Arabic and English, set against a backdrop of AlUla's Elephant Rock. The elegant suite features modern seat controls, a secondary touchscreen remote, and a green amenity kit resting on the side console."))],
        [('text', '<h1>Classes of Travel</h1>')],
    ])),
    section(block('cards', [
        [('image', img(f, alt)), ('text', f'<h3>{t}</h3><p>{d}</p><p><a href="{h}">{c}</a></p>')] for h, f, alt, t, d, c in cards
    ])),
])

# ---------------------------------------------------------------- chrome fragments
NOTICE = section(fix_links('<p><strong>Important Notice:</strong> <a href="/en-SA/travel-updates/202602281">Due to airspace closures, flights to certain destinations remain cancelled.</a></p>'), style='notice')
BRAND = section(fix_links(f'<p><a href="/en-SA"><img src="{MEDIA}saudia_logo_light_header-b716e8.png" alt="Saudia Header logo"></a> <a href="/en-SA"><img src="{MEDIA}LightTheme-SaudiaLogo-Mobile-426a54.png" alt="Saudia Header logo"></a> <a href="https://www.skyteam.com/"><img src="{MEDIA}Group-10407_Light-9a451e.png" alt="Skyteam Airlines Alliance"></a></p>'))
MENU = section('<ul><li>Explore</li><li>Plan</li><li>Book &amp; Manage</li><li>Experience</li><li>Loyalty</li><li>Support</li></ul>')


def tools(ai):
    return section(('<p>AI search</p>\n' if ai else '') + f'<p><img src="{MEDIA}Flag-saudi_arabia-857631.png" alt="">EN</p>\n<p>Login</p>')


page('nav', [NOTICE, BRAND, MENU, tools(False)])
page('nav-home', [NOTICE, BRAND, MENU, tools(True)])
page('nav-product', [BRAND, MENU, tools(False)])

foot = between(ath, '<footer class="site-footer">', '</footer>')


def footer_sections(copy_text=None, skyteam=True):
    sub_h2 = re.search(r'<h2>(.*?)</h2>', foot).group(1)
    sub_p = copy_text or re.search(r'<div class="subscribe__copy">.*?<p>(.*?)</p>', foot, re.S).group(1)
    s1 = section(f'<h2>{sub_h2}</h2>\n<p>{sub_p}</p>\n<p>Email address</p>\n<p>Subscribe</p>')
    logos = f'<a href="/en-SA"><img src="{MEDIA}saudia_logo_light_footer-21ee6e.png" alt="Saudia Footer logo"></a>'
    if skyteam:
        logos += f' <a href="https://www.skyteam.com/"><img src="{MEDIA}Group-10407_Light-2de76d.png" alt="Skyteam Airlines Alliance"></a>'
    groups = re.findall(r'<div class="footer-acc__item[^"]*"><h3>(.*?)</h3>.*?(<ul>.*?</ul>)</div>', foot, re.S)
    gl = []
    for h, ul in groups:
        ul = re.sub(r'<a href="([^"]*)">([^<]*)<span class="icon">call_made</span></a>', r'<a href="\1" title="External link">\2</a>', ul)
        gl.append(f'<h3>{h}</h3>\n{ul}')
    apps = re.search(r'<h3>(Download the Saudia app)</h3>\s*<ul>(.*?)</ul>', foot, re.S)
    badges = ' '.join(re.findall(r'<li>(.*?)</li>', apps.group(2), re.S))
    badges = re.sub(r'\s(aria-label|width|height)="[^"]*"', '', badges)
    s2 = section(f'<p>{logos}</p>\n' + '\n'.join(gl) + f'\n<h3>{apps.group(1)}</h3>\n<p>{badges}</p>')
    awards = re.findall(r'<li><img src="assets/media/([^"]*)" alt=""><span>(.*?)</span></li>', foot)
    aw = '\n'.join(f'<p><img src="{MEDIA}{f}" alt=""></p>\n<p>{t}</p>' for f, t in awards)
    social = re.findall(r'<li><a href="([^"]*)" aria-label="[^"]*"><img class="d" src="assets/media/([^"]*)" alt="([^"]*)"><img class="m" src="assets/media/([^"]*)" alt="[^"]*"></a></li>', foot)
    soc = '<ul>' + ''.join(f'<li><a href="{h}"><img src="{MEDIA}{d}" alt="{a}"><img src="{MEDIA}{m}" alt="{a}"></a></li>' for h, d, a, m in social) + '</ul>'
    s3 = section(aw + '\n' + soc)
    legal_ul = re.search(r'<div class="footer-block footer-legal">.*?(<ul>.*?</ul>)\s*<p>(.*?)</p>', foot, re.S)
    s4 = section(f'{legal_ul.group(1)}\n<p>{legal_ul.group(2)}</p>')
    return [fix_links(s) for s in (s1, s2, s3, s4)]


page('footer-saudia', footer_sections())
page('footer-saudia-product', footer_sections('Subscribe to our newsletter to receive exclusive information about new destinations and travel offers.'))
page('footer-saudia-experience', footer_sections(skyteam=False))
