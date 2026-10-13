"""Stage the approved replica pages as import SOURCES for tools/importer/import-replica.js.

Reads the gated pages (read-only) and writes one source HTML per AEM target path under
stardust/.work/import-src/<lang>/<target>.html. Serve that folder as the web root
(python3 -m http.server 8795 --directory stardust/.work/import-src) so the source URL path is
the target path; prototype media is symlinked in so /stardust/... image srcs resolve.
Duplicated chrome is collapsed: nav-home (the superset: notice + AI search) becomes the one
/en/nav, footer-saudia becomes the one /en/footer.
"""
import html
import json
import os
import re

ROOT = '/backups/nshahwan/saudiaeds/repo/'
OUT = ROOT + 'stardust/.work/import-src/'
LANG = 'en'
PAGES = {
    'en-sa/explore/saudia-new-destinations-2026/fly-to-athens': 'explore/saudia-new-destinations-2026/fly-to-athens',
    'en-sa/book-and-manage/book/flight-pass': 'book-and-manage/book/flight-pass',
    'en-sa/plan/on-board/classes-of-travel': 'plan/on-board/classes-of-travel',
    'nav-home': 'nav',
    'footer-saudia': 'footer',
}

M = '/stardust/prototypes/assets/media/'
# Home (approved 2026-10-08) adds chrome content to the shared fragments; template CSS shows it
# on the home page only: dark-theme logo renditions (nav brand, 4th–6th images) and the footer's
# payment partners (after the social links).
DARK_LOGOS = (f' <a href="https://www.saudia.com/en-SA"><img src="{M}saudia_logo_dark_header-a7222c.png" alt="Saudia Header logo"></a>'
              f' <a href="https://www.saudia.com/en-SA"><img src="{M}DarkeSauidaLogo-Mobile-41efb5.png" alt="Saudia Header logo"></a>'
              f' <a href="https://www.skyteam.com/"><img src="{M}sky_logo_dark_header_new-601e34.png" alt="Skyteam Airlines Alliance"></a>')
PAYMENTS = ('<p><strong>Payment Partners</strong></p><p>'
            + ''.join(f'<img src="{M}{f}" alt="{a}">' for f, a in [
                ('apple-pay-b01753.png', 'Apple Pay'), ('mada-33c666.png', 'Mada'), ('visa-ab0ee5.png', 'Visa'),
                ('mc-5269c1.png', 'Mastercard'), ('amex-74fdee.png', 'American Express'),
                ('sadad-5e5ef7.png', 'SADAD'), ('tamara-en-1426f5.png', 'Tamara')])
            + '</p>')


# Mega menus (live, captured 2026-10-13: stardust/migrate/megamenu.json): every top-level menu
# item carries its groups as a nested list — group title, then its links (title="External link"
# marks the live external-link icon) — and its promo card as a last item: image, heading link,
# description. Live hrefs to migrated pages point at /en, the rest at www.saudia.com.
MEGA = json.load(open(ROOT + 'stardust/migrate/megamenu.json', encoding='utf-8'))['menus']
MEDIA = json.load(open(ROOT + 'stardust/migrate/media-map.json', encoding='utf-8'))
MIGRATED = {'/en', '/en/plan/on-board/classes-of-travel', '/en/book-and-manage/book/flight-pass'} | {
    f'/en/explore/saudia-new-destinations-2026/fly-to-{n}' for n in
    'abha antalya athens bodrum el-alamein malaga mykonos nice salalah'.split()}


def mega_href(url):
    if not url or url.startswith(('http:', 'https:', 'mailto:', 'tel:')):
        return url
    path = url.split('?')[0].split('#')[0].rstrip('/')
    target = re.sub(r'^/en(-sa)?(?=/|$)', '/en', path, flags=re.I).lower()
    if target in MIGRATED:
        return target + url[len(path):]
    return 'https://www.saudia.com' + (url if url.startswith('/') else '/' + url)


def mega_link(link):
    label = html.escape(link['label'])
    if not link.get('href'):
        return f'<li>{label}</li>'
    ext = ' title="External link"' if link.get('external') else ''
    return f'<li><a href="{html.escape(mega_href(link["href"]))}"{ext}>{label}</a></li>'


def mega_menu(menu):
    items = [f'<li>{html.escape(g["title"])}<ul>{"".join(mega_link(l) for l in g["links"])}</ul></li>'
             for g in menu['groups']]
    promo = menu.get('promo')
    if promo:
        key = re.sub(r'^https?://www\.saudia\.com', '', html.unescape(promo['img']).split('?')[0])
        key = key if key.startswith('/') else '/' + key
        img = MEDIA.get(key, key)
        text = f' {html.escape(promo["text"])}' if promo.get('text') else ''
        items.append(f'<li><img src="{img}" alt="{html.escape(promo["alt"])}"> '
                     f'<a href="{html.escape(mega_href(promo["href"]))}">{html.escape(promo["heading"])}</a>{text}</li>')
    return f'<li>{html.escape(menu["label"])}<ul>{"".join(items)}</ul></li>'


def chrome(src, body):
    if src == 'nav-home':
        anchor = 'alt="Skyteam Airlines Alliance"></a>'
        assert body.count(anchor) == 1
        body = body.replace(anchor, anchor + DARK_LOGOS)
        menu = re.search(r'<ul>\s*<li>Explore</li>.*?</ul>', body, re.S)
        assert menu, 'nav menu list not found'
        body = body.replace(menu.group(0), '<ul>' + ''.join(mega_menu(m) for m in MEGA) + '</ul>')
    if src == 'footer-saudia':
        anchor = 'alt="linkedIn"></a></li></ul>'
        assert body.count(anchor) == 1
        body = body.replace(anchor, anchor + PAYMENTS)
        # the en-sa copies are superseded by /en: point the footer at the migrated page
        body = body.replace('href="/en-sa/plan/on-board/classes-of-travel"', f'href="/{LANG}/plan/on-board/classes-of-travel"')
    return body


for src, target in PAGES.items():
    body = chrome(src, open(f'{ROOT}content/{src}.plain.html', encoding='utf-8').read())
    dest = f'{OUT}{LANG}/{target}.html'
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(f'<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>{target}</title></head>'
                f'<body><main>{body}</main></body></html>')
    print(f'{src} -> /{LANG}/{target}')

exec(open(ROOT + 'stardust/replica/gen-home-source.py', encoding='utf-8').read())

media = OUT + 'stardust/prototypes/assets'
os.makedirs(os.path.dirname(media), exist_ok=True)
if not os.path.islink(media):
    os.symlink(ROOT + 'stardust/prototypes/assets', media)
