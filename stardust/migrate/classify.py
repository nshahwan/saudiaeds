"""Group the captured English pages (stardust/migrate/captures/*.json) into page templates by
their component signature (ordered app-jss-* components per top-level section) and body-class
page-type marker. Writes stardust/migrate/templates.json and prints a summary.
"""
import collections
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
CAP = os.path.join(HERE, 'captures')
NOISE = {'app-jss-columns', 'app-jss-theme', 'app-jss-html-snippet', 'app-jss-visitor-identification'}
# body classes that are runtime/locale state rather than page type
STATE = {'baselang', 'withtravelnotice', 'mwebhomepage', 'white-theme', 'dark-theme', 'body-transition',
         'overflow-x-hidden', 'home-page-hero-with-carousel', 'hide-scroll', 'no-scroll'}
APP = re.compile(r'aisearch|baggagetracker|emd-receipt|evisa|fare-detail|plusgrade|promocode|register|residual|'
                 r'search-result|checkin|managemybooking|booking|govt|seatselector|flightsearch|ancillar|multicity|'
                 r'payment|login|profile|myaccount|mytrips|verify-account|subscribe$|unsubscribe', re.I)


def signature(page):
    comps = []
    for s in page['sig']:
        c = [x for x in s['comps'] if x not in NOISE]
        if c:
            comps.append(c[0])
        elif s['tag'] not in ('div', 'app-jss-columns'):
            comps.append(s['tag'])
    # collapse runs of the same component (lists of teasers, repeated text blocks)
    out = []
    for c in comps:
        if not out or out[-1] != c:
            out.append(c)
    return tuple(out)


def kind(page):
    body = {c.lower() for c in page['bodyClass'].split()} - STATE
    return ' '.join(sorted(body)) or '-'


pages = []
for f in sorted(os.listdir(CAP)):
    p = json.load(open(os.path.join(CAP, f)))
    path = re.sub(r'^https?://[^/]+', '', p['url'])
    p['path'] = path
    p['slug'] = f[:-5]
    p['signature'] = signature(p)
    p['kind'] = kind(p)
    p['app'] = bool(APP.search(path)) or (not p['signature'] and p['h'] < 1500)
    pages.append(p)

groups = collections.defaultdict(list)
for p in pages:
    if p['app']:
        key = ('APP',)
    elif p['kind'] == '-' and 'iframe' in p['signature']:
        key = ('FLIGHT-DEALS',)
    else:
        key = (p['kind'],) + p['signature'][:4]
    groups[key].append(p)

summary = []
for key, ps in sorted(groups.items(), key=lambda kv: -len(kv[1])):
    summary.append({'key': ' | '.join(key), 'count': len(ps), 'sample': [x['path'] for x in ps[:4]],
                    'paths': [x['path'] for x in ps]})
json.dump(summary, open(os.path.join(HERE, 'templates.json'), 'w'), indent=1)
print(f'{len(pages)} pages, {len(groups)} groups')
for g in summary:
    print(f"{g['count']:4}  {g['key'][:120]}\n       e.g. {', '.join(g['sample'][:3])[:150]}")
