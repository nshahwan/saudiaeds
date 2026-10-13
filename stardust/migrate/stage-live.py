"""Stage captured LIVE pages as import sources (stardust/.work/import-src/en/<path>.html) for the
sibling import scripts (tools/importer/import-<type>.js). Image srcs / background images are
rewritten to the locally downloaded copies (media-map.json, from fetch-media.mjs); page title,
description and extras (e.g. the mobile hero rendition) travel as <meta> tags.

usage: stage-live.py <capture.json>...
"""
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '.work', 'import-src')
MAP = json.load(open(os.path.join(HERE, 'media-map.json')))
MOBILE = json.load(open(os.path.join(HERE, 'dest-mobile-hero.json')))
# legacy press releases: mobile banner rendition per page (collected at 360px: [src, alt, cms-page])
MOBILE.update({k: v[:2] for k, v in json.load(open(os.path.join(HERE, 'legacy-mobile-banner.json'))).items() if v[0]})


def key(u):
    k = re.sub(r'^https?://www\.saudia\.com', '', html.unescape(u).split('?')[0], flags=re.I)
    return k if k.startswith('/') else '/' + k  # relative `-/media/...` srcs


def localize(markup):
    def sub(m):
        k = key(m.group(2))
        return f'{m.group(1)}="{MAP[k]}"' if k in MAP else m.group(0)
    return re.sub(r'(src|data-bg)="((?:[^"]*/)?-/media/[^"]+)"', sub, markup)


def target(path):
    # /en-SA/... and /en/... both land under the AEM language root /en (lower-case path)
    return re.sub(r'^/en(-sa)?(?=/|$)', '/en', path, flags=re.I).lower()


# every page staged in one run is one import batch: links between them stay on the new site
BATCH = ' '.join(target(re.sub(r'^https?://[^/]+', '', json.load(open(f))['url'])) for f in sys.argv[1:])

for f in sys.argv[1:]:
    cap = json.load(open(f))
    path = re.sub(r'^https?://[^/]+', '', cap['url'])
    dest = os.path.join(OUT, target(path).lstrip('/') + '.html')
    metas = [('description', cap.get('desc') or ''), ('migrated', BATCH), ('body-class', cap.get('bodyClass') or '')]
    mob = MOBILE.get(path) or (MOBILE.get('*dec-2025') if 'dec-2025' in path else None)
    if mob:
        metas += [('mobile-hero', MAP.get(key(mob[0]), mob[0])), ('mobile-hero-alt', mob[1])]
    head = f'<title>{html.escape(cap.get("title") or "")}</title>' + ''.join(
        f'<meta name="{n}" content="{html.escape(v)}">' for n, v in metas)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'w', encoding='utf-8') as out:
        out.write(f'<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">{head}</head>'
                  f'<body><main>{localize(cap["html"])}</main></body></html>')
    print(target(path))

media = os.path.join(OUT, 'stardust', 'migrate', 'media')
os.makedirs(os.path.dirname(media), exist_ok=True)
if not os.path.islink(media):
    os.symlink(os.path.join(HERE, 'media'), media)
