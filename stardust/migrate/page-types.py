"""Assign every captured English page a page type from its component vocabulary (which Sitecore
components it uses), not their exact order. Writes stardust/migrate/page-types.json.
Run after classify.py (reuses its signature/kind helpers)."""
import collections
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, 'classify.py'), encoding='utf-8').read().split('groups = collections')[0])

APP_COMPS = {'app-jss-modal', 'app-jss-register-alfursan', 'app-jss-subscription-modal', 'app-jss-accordian-mmb',
             'app-jss-add-voucher', 'app-jss-checkin-boarding-passess', 'app-jss-flight-schedule',
             'app-jss-featured-fare', 'app-jss-deals-for-you', 'app-jss-alfursan-cc'}
CONTENT = {'app-jss-image-link-list', 'app-jss-title-text', 'app-jss-image', 'app-jss-space', 'app-jss-tabs',
           'app-jss-faq', 'app-jss-title-text-button', 'app-jss-table', 'app-jss-title-description', 'app-jss-news',
           'app-jss-breadcrumbs'}
DONE = {'/en-SA', '/en-SA/explore/saudia-new-destinations-2026/fly-to-athens',
        '/en-SA/book-and-manage/book/flight-pass', '/en-SA/plan/on-board/classes-of-travel'}


def vocab(p):
    v = set()
    for s in p['sig']:
        v.update(c for c in s['comps'] if c not in NOISE)
    return v


def page_type(p):
    v = vocab(p)
    if p['app'] or v & APP_COMPS:
        return 'app'
    if p['kind'] == '-' and 'iframe' in p['signature']:
        return 'flight-deals'
    if 'app-jss-saudia-general-tablayout' in v:
        return 'destination' if '/fly-to-' in p['path'].lower() else 'booking-landing'
    if v & {'app-jss-special-offers', 'app-jss-about-special-offers', 'app-jss-earn-partners'}:
        return 'loyalty-offer'
    if v & {'app-jss-faqs', 'app-jss-enhanced-faqs'}:
        return 'faq'
    if v and v <= CONTENT:
        return 'press-release' if '/press-release' in p['path'].lower() else 'content'
    return 'other:' + '+'.join(sorted(c.replace('app-jss-', '') for c in v - CONTENT))[:60]


types = collections.defaultdict(list)
for p in pages:
    t = 'done' if p['path'] in DONE else page_type(p)
    types[t].append(p)

out = {t: [{'path': p['path'], 'slug': p['slug'], 'h': p['h'], 'title': p['title'], 'vocab': sorted(vocab(p))} for p in ps]
       for t, ps in types.items()}
json.dump(out, open(os.path.join(HERE, 'page-types.json'), 'w'), indent=1)
for t, ps in sorted(types.items(), key=lambda kv: -len(kv[1])):
    voc = collections.Counter(c for p in ps for c in vocab(p))
    top = ', '.join('%s:%d' % (k.replace('app-jss-', ''), n) for k, n in voc.most_common(7))
    print(f"{len(ps):4}  {t:28} {top[:120]}")
    print(f"        e.g. {', '.join(p['path'] for p in ps[:3])[:140]}")
