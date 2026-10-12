"""Build local EDS harness pages from the migrated /en content (content/en/**.plain.html).

Same as eds-harness.py, for the AEM-path pages: the page `metadata` block becomes <meta>
tags (template/theme → body classes). The pages carry no nav/footer property (chrome
resolves from the language root on AEM/EDS); the local server serves content under
/content/, so the harness alone pins nav/footer to /content/en/nav and /content/en/footer.
Output: stardust/.work/harness/en-<name>.html
"""
import re

ROOT = '/backups/nshahwan/saudiaeds/repo/'
PAGES = {
    'abha': 'en/explore/saudia-new-destinations-2026/fly-to-abha',
    'salalah': 'en/explore/saudia-new-destinations-2026/fly-to-salalah',
    'press-release': 'en/about-us/press-releases/press-release-07082026',
    'pr-list': 'en/about-us/press-releases/2024/05/press-release-24052024',
    'pr-figure': 'en/about-us/press-releases/press-release-30042026-2',
    'pr-divquote': 'en/about-us/press-releases/press-release-04052026-1',
    'pr-nosub': 'en/about-us/press-releases/press-release-04052026',
    'press-legacy': 'en/about-us/press-releases/2024/12/press-release-26122024',
    'press-plain': 'en/about-us/press-releases/press-release-19062025',
    'index': 'en/index',
    'fly-to-athens': 'en/explore/saudia-new-destinations-2026/fly-to-athens',
    'flight-pass': 'en/book-and-manage/book/flight-pass',
    'classes-of-travel': 'en/plan/on-board/classes-of-travel',
}
for name, path in PAGES.items():
    c = open(f'{ROOT}content/{path}.plain.html', encoding='utf-8').read()
    m = re.search(r'<div>\s*<div class="metadata">(.*?)</div>\s*</div>\n', c, re.S)
    meta = {k.lower(): v for k, v in re.findall(r'<div><div>([^<]*)</div><div>([^<]*)</div></div>', m.group(1))}
    body = c.replace(m.group(0), '')
    meta.update(nav='/content/en/nav', footer='/content/en/footer')
    tags = ''.join(f'<meta name="{k}" content="{v}">' for k, v in meta.items() if k != 'title')
    html = (f'<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>{meta["title"]}</title>{tags}'
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            '<script src="/scripts/aem.js" type="module"></script><script src="/scripts/scripts.js" type="module"></script>'
            f'<link rel="stylesheet" href="/styles/styles.css"></head><body><header></header><main>{body}</main><footer></footer></body></html>')
    open(f'{ROOT}stardust/.work/harness/en-{name}.html', 'w', encoding='utf-8').write(html)
    print(name, {k: v for k, v in meta.items() if k in ('template', 'theme')})
