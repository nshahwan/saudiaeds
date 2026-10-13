"""Write the import SOURCE for the home page (stardust/.work/import-src/en/index.html):
EDS section/block markup with xwalk field hints, content verbatim from the approved replica
(stardust/prototypes/_main/home.html) and the capture (stardust/current/pages/home.json).
Run by stage-import-src.py; the importer (tools/importer/import-replica.js) turns it into
content/en/index.plain.html.

Links: root-relative live links become absolute saudia.com links, except the pages already
migrated to /en (they point at their new paths).
"""
import html
import os

OUT = '/backups/nshahwan/saudiaeds/repo/stardust/.work/import-src/en/index.html'
MEDIA = '/stardust/prototypes/assets/media/'
MIGRATED = {
    '/en/book-and-manage/book/flight-pass': '/en/book-and-manage/book/flight-pass',
    '/en-SA/book-and-manage/book/flight-pass': '/en/book-and-manage/book/flight-pass',
    '/en-SA/plan/on-board/classes-of-travel': '/en/plan/on-board/classes-of-travel',
}


def href(u):
    if u in MIGRATED:
        return MIGRATED[u]
    if u.startswith('/'):
        return 'https://www.saudia.com' + u
    return u


def esc(t):
    return html.escape(t, quote=False)


def link(text, u, attrs=''):
    return f'<a href="{html.escape(href(u))}"{attrs}>{esc(text)}</a>'


def pic(name, alt=''):
    return f'<picture><img src="{MEDIA}{name}" alt="{html.escape(alt)}"></picture>'


def cell(field, inner):
    return f'<div><!-- field:{field} -->{inner}</div>' if field else f'<div>{inner}</div>'


def block(name, rows):
    return f'<div class="{name}">' + ''.join('<div>' + ''.join(cell(f, i) for f, i in r) + '</div>' for r in rows) + '</div>'


def section(*parts, style=None):
    meta = f'<div class="section-metadata"><div><div>style</div><div>{style}</div></div></div>' if style else ''
    return '<div>' + ''.join(parts) + meta + '</div>'


def media_rows(desktop, mobile, alt=''):
    return [('image', pic(desktop, alt))], [('mobileImage', pic(mobile, alt))]


SLIDES = [
    ('Saudia_Gulf-Cup_1920-600-en-a86c8b.jpg', 'Saudia_Gulf-Cup_1270x1200-272d96.jpg', '27% Off on domestic flights', 'Promo code: FALCONS', 'Buy now', '/en-SA/campaigns/falcons'),
    ('Saudia_Europe-Fall-Campaign_2026_3840x1200_EN-72b9bb.jpg', 'Saudia_Europe-Fall-Campaign_2026_1270x1200-027f4c.jpg', 'An autumn you love in our destinations', None, 'Buy now', '/en-SA/explore/fall_destinations'),
    ('Saudia_Tokyo_Culture_1920-600-en-1-e51aad.jpg', 'Saudia_Tokyo_Culture_1270x1200-1-8d0cae.jpg', 'Tokyo, Now Within Reach', '3 direct weekly flights from Riyadh starting from 16 Nov 2026', 'Book now', '/en-SA/campaigns/flights-to-tokyo'),
    ('BANNERS_web-banner-SV-EN-9a9d01.jpg', 'BANNERS_mweb-banner-SV-EN-b56fa6.jpg', 'Flight + Hotel Sale', 'Book early. Save more. 60+ destinations', 'Discover Now', 'https://www.saudia.com/en-SA/saudia-holidays/holidays-exclusive-offers'),
    ('26122023-fly-saudia-stopover-makkah-top-2b-en-2-77aa80.jpg', '26122023-fly-saudia-stopover-makkah-mweb-2-5bf49f.jpg', 'Fly Saudia for Umrah', None, 'Book Now', '/en-SA/umrah/fly-saudia-for-umrah-packages'),
]
FARES = [
    ('phuket-f44b79.jpg', 'Phuket sea view', 'Phuket', 'From SAR 2246', 'HKT'),
    ('L-cassablanca-1-b3bdda.jpg', 'The Casablanca clock tower in Morocco.', 'Casablanca', 'From SAR 2423', 'CMN'),
    ('L-guangzho-1-3aedde.jpg', 'The entrance to the Ancestral temple in the Foshan region of Guangzhou region, China.', 'Guangzhou', 'From SAR 2012', 'CAN'),
    ('L-cairo-1-1a26c5.jpg', 'A camel resting with the great pyramids in the background, Cairo, Egypt.', 'Cairo', 'From SAR 852', 'CAI'),
    ('L-Mumbai-78c7dd.jpg', 'Landscape of Gateway Of India Mumbai, with multiple boats sailing the river and tourists enjoying the view.', 'Mumbai', 'From SAR 1159', 'BOM'),
]
OFFERS = [
    ('my-upgrade-web-7e1053.jpg', 'my-upgrade-mweb-de2a13.jpg', 'Let’s get you upgraded', "Here's your chance to upgrade to a higher class. Place a bid and experience the best in comfort, services, and entertainment.", None),
    ('card3-ba42db.jpg', 'last-minute-offer-3-07072024-home-mweb-en-f1a9e0.jpg', 'Hot deals', None, None),
    ('insurance-web-ee5238.jpg', 'insurance-mweb-ede8cc.jpg', 'Travel insurance', None, '/en/book-and-manage/book/travel-insurance'),
    ('flight-pass-web-en-290864.jpg', 'flight-pass-mweb-en-143615.jpg', 'Saudia Flight Pass', None, '/en/book-and-manage/book/flight-pass'),
]
STORIES = [
    ('Time-flies-6c116b.jpg', 'Time-flies-mob-8497e1.jpg', 'Time Flies with BEYOND', 'Discover our new entertainment experience BEYOND and learn more about the various entertainment channels and services available on your flight.', 'https://entertainment.saudia.com'),
    ('banner-1270x1200-d4def5.jpg', 'banner-670x423-cf89a0.jpg', 'Saudia Named “Best Airline Staff Service” at the 2025 Skytrax Awards', 'The airline climbs to 17th place in global ranking, reflecting excellence across the guest journey', 'https://www.saudia.com/en/about-us/press-releases/press-release-17062025'),
    ('Saudia_Travel-Companion_Web_1240x1171_EN-78fe0c.jpg', 'Saudia_Travel-Companion_Web_960x540_EN-60398f.jpg', 'Saudia Travel Companion', 'A cutting-edge tool crafted to elevate the travel experience through the power of artificial intelligence and natural language processing.', '/en-SA/Companion'),
]


def promo(desktop, mobile, alt, title, desc, cta, u, variant=''):
    text = f'<h2>{esc(title)}</h2>' + (f'<p>{esc(desc)}</p>' if desc else '') + f'<p><strong>{link(cta, u)}</strong></p>'
    name = f'promo {variant}'.strip()
    return section(block(name, [*media_rows(desktop, mobile, alt), [('text', text)]]))


meta = ('<div><div class="metadata">'
        '<div><div>Title</div><div>Saudia | Book flights | Hotels | Holidays</div></div>'
        '<div><div>Description</div><div>Saudia Home Page</div></div>'
        '<div><div>template</div><div>home</div></div>'
        '</div></div>')

carousel_rows = []
for i, (d, m, title, desc, cta, u) in enumerate(SLIDES):
    tag = 'h1' if i == 0 else 'h2'  # the first slide title is the page heading (R-07)
    text = f'<{tag}>{esc(title)}</{tag}>' + (f'<p>{esc(desc)}</p>' if desc else '') + f'<p><strong>{link(cta, u)}</strong></p>'
    carousel_rows.append([('image', pic(d)), ('mobileImage', pic(m)), ('text', text)])

booking = block('booking', [
    [('tabs', '<ul><li>Book</li><li>Manage</li><li>Check-in</li><li>Flight status</li><li>Flight schedule</li></ul>'
              f'<p>{link("Stopover", "/en-SA/transit-visa")}</p>'
              f'<p>{link("Flight + Hotel", "/en-SA/saudia-holidays/holidays-exclusive-offers")}</p>'
              f'<p>{link("Umrah", "/en-SA/umrah/fly-saudia-for-umrah-packages")}</p>'
              f'<p>{link("Hotels", "https://www.expedia.sa/Saudia")}</p>')],
    [('trip', '<p>Round trip</p><p>One way</p><p>Multi-city</p><p>Book with Miles</p>')],
    [('route', '<p>From</p><p>Jeddah (JED)</p><p>To</p>')],
    [('info', '<p>Read more about the latest travel requirements for your next destination</p>'
              f'<p>{link("Learn more", "/en-SA/plan/before-you-fly/travel-requirements")}</p>')],
])

fares = block('fares', [[('image', pic(img, alt)),
                         ('text', f'<h3>{link(city, f"/en-SA/Multicity/FlightSearch?B_LOCATION=JED&E_LOCATION={code}&trip_type=R")}</h3>'
                                  f'<p>{esc(price)}</p><p>Round trip From Jeddah</p>')]
                        for img, alt, city, price, code in FARES])

offers = block('offers', [[('image', pic(d)), ('mobileImage', pic(m)),
                           ('text', (f'<h3>{link(title, u)}</h3>' if u else f'<h3>{esc(title)}</h3>') + (f'<p>{esc(desc)}</p>' if desc else ''))]
                          for d, m, title, desc, u in OFFERS])

stories = block('stories', [[('image', pic(d)), ('mobileImage', pic(m)),
                             ('text', f'<h3>{esc(title)}</h3><p>{esc(desc)}</p><p>{link("Learn more", u)}</p>')]
                            for d, m, title, desc, u in STORIES])

body = ''.join([
    meta,
    section(block('carousel', carousel_rows)),
    section(booking),
    section('<h2>Best fares from <em>Jeddah</em></h2><p>Fares include taxes</p>'
            '<p><a href="#">Explore all destinations</a></p>', fares),
    section('<h2>Exclusive Offers for You</h2>'
            f'<p>{link("Explore all offers", "/en-SA/offers")}</p>', offers),
    promo('saudia-holidays-banner-web-en-opt-c0a05a.jpg', 'saudia-holidays-banner-mweb-en-opt-d8cf18.jpg',
          'A promotional green Saudia Holidays banner highlighting discounts of up to 50%, alongside a smartphone interface displaying a Maldives resort vacation package with pricing and stay details.',
          'Flight + Hotel Deals', None, 'Book now', '/en-SA/saudia-holidays/holidays-exclusive-offers', 'bottom'),
    promo('Banner_Desktop-1366--550---EN-1-86679c.jpg', 'Banner_Web-1020x864-EN-1-31598e.jpg', '',
          'Shop with Miles', None, 'AlFursan Store', '#'),
    promo('SVW-MID-newsletter-en-9f1f1a.jpg', 'SVW-MID-newsletter-mobile-92e431.jpg', '',
          'Be first to know', 'Discover the world of Saudia: Get early information about deals and interesting information delivered right to your inbox',
          'I want to be first', 'https://www.saudia.com/Subscribe/'),
    section('<h2>Exceptional experiences with Saudia</h2>'
            '<p>Explore the world, earn rewards and live the best adventures with Saudia.</p>', stories, style='theme-light'),
    promo('sta-calendar-en-ae8d69.jpg', 'sta-calendar-en-mobile-7ceefe.jpg', 'visit saudi',
          'The best that Saudi Arabia has to offer', 'Explore the Visit Saudi calendar', 'Explore',
          'https://www.visitsaudi.com/content/dam/documents/saudi-calendar.pdf'),
])

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>index</title></head>'
            f'<body><main>{body}</main></body></html>')
print('wrote', OUT)
