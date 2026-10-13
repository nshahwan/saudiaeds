"""Move the migrated pages' media into the AEM DAM tree: /content/dam/saudiaeds/<area>/<file>.

Runs AFTER staging (stage-live.py, ../replica/stage-import-src.py) and BEFORE the bulk import.
For every staged import source (stardust/.work/import-src/<lang>/<path>.html) it collects the
local media references (/stardust/prototypes/assets/media/…, /stardust/migrate/media/…),
assigns each file one DAM folder by the site area that uses it, copies the file into the
workspace DAM staging folder (content/content/dam/saudiaeds/<area>/, which the platform uploads
to /content/dam/saudiaeds/<area>/ and the local preview serves at that path), and rewrites the
staged sources in place, so the imported pages reference /content/dam/saudiaeds/… directly.

Areas: chrome (nav + footer), home (the language root page), then the first path segment of
the page (explore, about-us, book-and-manage, plan, …); a file used by more than one area goes
to `shared`. Idempotent: an already-copied, identical file is left as is.

usage: dam.py            (writes stardust/migrate/dam-map.json: local path -> DAM path)
"""
import filecmp
import json
import os
import re
import shutil

ROOT = '/backups/nshahwan/saudiaeds/repo/'
SRC = ROOT + 'stardust/.work/import-src/'
DAM = '/content/dam/saudiaeds'
DAM_DIR = ROOT + 'content' + DAM  # workspace DAM staging folder
REF = re.compile(r'(?<=["\s,])(/stardust/(?:prototypes/assets/media|migrate/media)/[^"\s,?#]+)')


def area(page):
    parts = page.split('/')  # <lang>/<segment>/…
    if len(parts) == 2:
        name = parts[1]
        return 'chrome' if name in ('nav', 'footer') else 'home' if name == 'index' else name
    return parts[1]


pages = {}
for dirpath, _, files in os.walk(SRC):
    if '/stardust' in dirpath.replace(SRC, '/') or '/content' in dirpath.replace(SRC, '/'):
        continue
    for f in files:
        if f.endswith('.html'):
            full = os.path.join(dirpath, f)
            pages[os.path.relpath(full, SRC)[:-5]] = full

uses = {}
for page, full in pages.items():
    for ref in set(REF.findall(open(full, encoding='utf-8').read())):
        uses.setdefault(ref, set()).add(area(page))

MAP_FILE = ROOT + 'stardust/migrate/dam-map.json'
# merge with earlier runs (sources already rewritten no longer show their local refs)
previous = json.load(open(MAP_FILE)) if os.path.exists(MAP_FILE) else {}
mapping, copied, names = {}, 0, {}
for ref, areas in sorted(uses.items()):
    folder = next(iter(areas)) if len(areas) == 1 else 'shared'
    name = os.path.basename(ref)
    key = f'{folder}/{name}'
    if key in names and names[key] != ref:  # same file name from two sources: keep both
        stem, ext = os.path.splitext(name)
        name = f'{stem}-{len(names)}{ext}'
        key = f'{folder}/{name}'
    names[key] = ref
    local = ROOT + ref.lstrip('/')
    if not os.path.exists(local):
        print('missing', ref)
        continue
    dest = f'{DAM_DIR}/{key}'
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if not (os.path.exists(dest) and filecmp.cmp(local, dest, shallow=False)):
        shutil.copyfile(local, dest)
        copied += 1
    mapping[ref] = f'{DAM}/{key}'

for page, full in pages.items():
    s = open(full, encoding='utf-8').read()
    out = REF.sub(lambda m: mapping.get(m.group(1), m.group(1)), s)
    if out != s:
        open(full, 'w', encoding='utf-8').write(out)

# the import-source server resolves the new srcs too
link = SRC + 'content'
if not os.path.islink(link):
    os.symlink(ROOT + 'content/content', link)

json.dump({**previous, **mapping}, open(MAP_FILE, 'w'), indent=1, sort_keys=True)
by_folder = {}
for v in mapping.values():
    by_folder[v.split('/')[4]] = by_folder.get(v.split('/')[4], 0) + 1
print(json.dumps({'pages': len(pages), 'assets': len(mapping), 'copied': copied, 'folders': by_folder}))
