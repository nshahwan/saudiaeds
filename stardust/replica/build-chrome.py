"""Assemble archetype prototypes from the gated canon chrome (header/footer of the
explore-destination prototype) plus a per-page <main> fragment, applying the measured
per-page chrome variants. Usage: build-chrome.py <slug>  (reads prototypes/_main/<slug>.html)
"""
import re
import sys

P = '/backups/nshahwan/saudiaeds/repo/stardust/prototypes/'
src = open(P + 'explore-destination-proposed.html', encoding='utf-8').read()
header = re.search(r'  <header class="site-header">.*?</header>\n', src, re.S).group(0)
footer = re.search(r'  <footer class="site-footer">.*?</footer>\n', src, re.S).group(0)
tail = re.search(r'  <button class="feedback-tab".*?</body>', src, re.S).group(0)

PAGES = {
    'book-manage-flight-pass': {
        'title': 'Saudia Annual Flight Pass: Fixed Fares &amp; Flexible Travel',
        'live': 'https://www.saudia.com/en-SA/book-and-manage/book/flight-pass',
        'archetype': 'book-manage-product (Book &amp; Manage › product/service page)',
        'body': 'page-product',
        'notice': False, 'ai_search': False, 'login_filled': False,
        'footer_copy': 'Subscribe to our newsletter to receive exclusive information about new destinations and travel offers.',
        'footer_skyteam': True,
    },
    'experience-classes': {
        'title': 'Classes of Travel and Cabin Experience | Saudia',
        'live': 'https://www.saudia.com/en-SA/plan/on-board/classes-of-travel',
        'archetype': 'experience-cards (Experience › card listing page)',
        'body': 'has-notice page-cards',
        'notice': True, 'ai_search': False, 'login_filled': False,
        'footer_copy': None,
        'footer_skyteam': False,
    },
    'press-release': {
        'title': 'Saudia Ranks First Worldwide in On-Time Performance for the Third Consecutive Month in 2026',
        'live': 'https://www.saudia.com/en-SA/about-us/press-releases/press-release-07082026',
        'archetype': 'press-release (About us › press release, modern article layout)',
        'body': 'has-notice page-article',
        'notice': True, 'ai_search': False, 'login_filled': False,
        'footer_copy': None,
        'footer_skyteam': False,
        'desc': '',
    },
    'press-legacy': {
        'title': 'Saudia | Book Flights | Hotels | Holidays Packages',
        'live': 'https://www.saudia.com/en-SA/about-us/press-releases/2024/12/press-release-26122024',
        'archetype': 'press-legacy (About us › press release, legacy banner + title + body layout)',
        'body': 'page-legacy',
        'notice': False, 'ai_search': False, 'login_filled': False,
        'footer_copy': 'Subscribe to our newsletter to receive exclusive information about new destinations and travel offers.',
        'footer_skyteam': True,
        'desc': '',
    },
    'home': {
        'title': 'Saudia | Book flights | Hotels | Holidays',
        'live': 'https://www.saudia.com/en-SA',
        'archetype': 'home (dark theme home page, fixed morphing header)',
        'body': 'has-notice page-home',
        'notice': True, 'ai_search': True, 'login_filled': True,
        'footer_copy': None,
        'footer_skyteam': True,
        'dark_header': True, 'payments': True,
    },
}

DARK_LOGOS = {  # light-theme logo (canon) -> dark-theme logo, both kept; CSS shows one per theme
    'saudia_logo_light_header-b716e8.png': 'saudia_logo_dark_header-a7222c.png',
    'LightTheme-SaudiaLogo-Mobile-426a54.png': 'DarkeSauidaLogo-Mobile-41efb5.png',
    'Group-10407_Light-9a451e.png': 'sky_logo_dark_header_new-601e34.png',
}
PAYMENTS = '''        <div class="payments">
          <h3>Payment Partners</h3>
          <ul>
            <li><img src="assets/media/apple-pay-b01753.png" alt="Apple Pay"></li>
            <li><img src="assets/media/mada-33c666.png" alt="Mada"></li>
            <li><img src="assets/media/visa-ab0ee5.png" alt="Visa"></li>
            <li><img src="assets/media/mc-5269c1.png" alt="Mastercard"></li>
            <li><img src="assets/media/amex-74fdee.png" alt="American Express"></li>
            <li><img src="assets/media/sadad-5e5ef7.png" alt="SADAD"></li>
            <li><img src="assets/media/tamara-en-1426f5.png" alt="Tamara"></li>
          </ul>
        </div>
'''

slug = sys.argv[1]
cfg = PAGES[slug]
h = header.replace('<h1 class="sr-only">Fly to Athens</h1>', f'<h1 class="sr-only">{cfg["title"]}</h1>')
if not cfg['notice']:
    h = re.sub(r'    <div class="notice">.*?\n    </div>\n(?=    <div class="nav-bar">)', '', h, flags=re.S)
if not cfg['ai_search']:
    h = re.sub(r'          <button class="ai-search".*?</button>\n', '', h)
if not cfg['login_filled']:
    h = h.replace('login-btn login-btn--filled', 'login-btn')
f = footer
if cfg['footer_copy']:
    f = f.replace('Subscribe to our newsletter to receive exclusive information about new destinations and offers.', cfg['footer_copy'])
if not cfg['footer_skyteam']:
    # live keeps the (empty) SkyTeam slot, so the main logo stays where it is
    f = re.sub(r'<a href="https://www.skyteam.com/"><img class="logo-skyteam"[^\n]*</a>', '<span class="skyteam-slot" aria-hidden="true"></span>', f)
if cfg.get('dark_header'):
    for light, dark in DARK_LOGOS.items():
        h = re.sub(rf'<img src="assets/media/{re.escape(light)}" alt="([^"]*)">',
                   rf'<img class="on-dark" src="assets/media/{dark}" alt="\1"><img class="on-light" src="assets/media/{light}" alt="\1">', h)
if cfg.get('payments'):
    # live stacks the payment partners under the social links (right column of the awards row)
    f = re.sub(r'(        <ul class="social">.*?</ul>\n)', lambda m: '        <div class="footer-awards__side">\n'
               + m.group(1).replace('\n        ', '\n          ').replace('        <ul', '          <ul', 1)
               + PAYMENTS.replace('\n        ', '\n          ').replace('        <div', '          <div', 1) + '        </div>\n', f, flags=re.S)

main = open(P + f'_main/{slug}.html', encoding='utf-8').read()
import json
desc = cfg['desc'] if 'desc' in cfg else json.load(
    open(f'/backups/nshahwan/saudiaeds/repo/stardust/current/pages/{slug}.json'))['meta']['description']
html = f'''<!doctype html>
<html lang="en-SA" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{cfg["title"]}</title>
  <meta name="description" content="{desc}">
  <!-- archetype: {cfg["archetype"]} — replica of
       {cfg["live"]} -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@200..500,0..1&amp;family=Material+Icons&amp;family=Material+Icons+Outlined&amp;display=swap">
  <link rel="stylesheet" href="canon.css">
  <link rel="stylesheet" href="{slug}.css">
</head>
<body class="{cfg["body"]}">
{h}
{main}
{f}
{tail}
</html>
'''
open(P + f'{slug}-proposed.html', 'w', encoding='utf-8').write(html)
print('wrote', slug)
