"""Build local EDS harness pages from handed-off (envelope-stripped) content/*.plain.html.

The page `metadata` block becomes <meta> tags (template/theme drive body classes via
decorateTemplateAndTheme); nav/footer point at the /content/ prefix the local
`aem up --html-folder content` server uses. Output: stardust/.work/harness/<name>.html
"""
import re

PAGES = {
    'fly-to-athens': ('en-sa/explore/saudia-new-destinations-2026/fly-to-athens', '/content/nav-home', '/content/footer-saudia'),
    'flight-pass': ('en-sa/book-and-manage/book/flight-pass', '/content/nav-product', '/content/footer-saudia-product'),
    'classes-of-travel': ('en-sa/plan/on-board/classes-of-travel', '/content/nav', '/content/footer-saudia-experience'),
}
ROOT = '/backups/nshahwan/saudiaeds/repo/'
for name, (path, nav, foot) in PAGES.items():
    c = open(f'{ROOT}content/{path}.plain.html', encoding='utf-8').read()
    m = re.search(r'<div>\s*<div class="metadata">(.*?)</div>\s*</div>\n', c, re.S)
    meta = {k.lower(): v for k, v in re.findall(r'<div><div>([^<]*)</div><div>([^<]*)</div></div>', m.group(1))}
    body = c.replace(m.group(0), '')
    meta.update(nav=nav, footer=foot)
    tags = ''.join(f'<meta name="{k}" content="{v}">' for k, v in meta.items() if k != 'title')
    html = (f'<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>{meta["title"]}</title>{tags}'
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            '<script src="/scripts/aem.js" type="module"></script><script src="/scripts/scripts.js" type="module"></script>'
            f'<link rel="stylesheet" href="/styles/styles.css"></head><body><header></header><main>{body}</main><footer></footer></body></html>')
    open(f'{ROOT}stardust/.work/harness/{name}.html', 'w', encoding='utf-8').write(html)
    print(name, meta.get('template'))
