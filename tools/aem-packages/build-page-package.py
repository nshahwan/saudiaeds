"""Package migrated pages for the AEM author, one content node per page.

Reads the JCR the workspace converted from the local content (migration-work/jcr-content/<path>.xml,
the same conversion the import uses: html2md, then md2jcr with this project's component models)
and writes tools/aem-packages/dist/saudiaeds-pages-<name>-<version>.zip for Package Manager.

Each page maps to /content/saudiaeds/<path> (the site root, paths.json). The filter covers only
each page's jcr:content: installing replaces that page's content (its sections, blocks and page
properties) and never touches its child pages, other pages, assets or the page node itself.

With --new <root>, the pages are new to AEM: the package holds the pages, the pages between
<root> and them (minimal, titled after their folder) and every DAM image the pages reference
(from the local content), all with filter mode merge — installing creates what is missing and
never changes or removes anything that already exists (pages or assets).

usage: python3 tools/aem-packages/build-page-package.py <name> <page path>...
       python3 tools/aem-packages/build-page-package.py <name> --new <root> <page path>...
       e.g. build-page-package.py homepage en/index
            build-page-package.py explore --new en/explore en/explore/<folder>/<page> …
"""
import os
import re
import sys
import zipfile
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
JCR = os.path.join(REPO, 'migration-work', 'jcr-content')
SITE = '/content/saudiaeds'
GROUP = 'saudiaeds'

if len(sys.argv) < 3:
    sys.exit(__doc__)
name, args = sys.argv[1], sys.argv[2:]
new_root = None
if args[:1] == ['--new']:
    new_root, args = args[1].strip('/'), args[2:]
pages = [p.strip('/') for p in args]
version = datetime.now(timezone.utc).strftime('%Y.%m.%d-%H%M')
CONTENT = os.path.join(REPO, 'content')

files = {}
binaries = {}
for page in pages:
    src = os.path.join(JCR, f'{page}.xml')
    if not os.path.isfile(src):
        sys.exit(f'{src} not found: convert the page first (the workspace writes it from content/{page}.plain.html)')
    xml = open(src, encoding='utf-8').read()
    if not re.search(r'jcr:primaryType="cq:Page"', xml) or '<jcr:content' not in xml:
        sys.exit(f'{src} is not a cq:Page docview')
    files[f'jcr_root{SITE}/{page}/.content.xml'] = xml

if new_root:
    head = re.match(r'(<\?xml[^>]*>\s*<jcr:root [^>]*?)\s*jcr:primaryType="cq:Page"', files[next(iter(files))]).group(1)
    for page in pages:
        if not page.startswith(f'{new_root}/') and page != new_root:
            sys.exit(f'{page} is not under {new_root}')
        # the pages between the root and the page, created only if missing
        parts = page.split('/')
        for i in range(len(new_root.split('/')), len(parts)):
            parent = '/'.join(parts[:i])
            key = f'jcr_root{SITE}/{parent}/.content.xml'
            if key not in files:
                title = parts[i - 1].replace('-', ' ').capitalize()
                files[key] = (f'{head}\n    jcr:primaryType="cq:Page">\n    <jcr:content\n'
                              '        cq:template="/libs/core/franklin/templates/page"\n'
                              '        sling:resourceType="core/franklin/components/page/v1/page"\n'
                              f'        jcr:primaryType="cq:PageContent"\n        jcr:title="{title}"/>\n</jcr:root>\n')
        # the DAM images the page references (local copies of the migrated assets)
        local = open(os.path.join(CONTENT, f'{page}.plain.html'), encoding='utf-8').read()
        for src in sorted(set(re.findall(r'src="(/content/dam/[^"?#]+)"', local))):
            path = os.path.join(CONTENT, src.lstrip('/'))
            if not os.path.isfile(path):
                sys.exit(f'{src} (referenced by {page}) is not in the local content')
            binaries[f'jcr_root{src}'] = open(path, 'rb').read()
    dam_folders = sorted({os.path.dirname(k[len('jcr_root'):]) for k in binaries})
    for d in dam_folders:  # Assets folders, created only if missing
        files[f'jcr_root{d}/.content.xml'] = (
            f'{head}\n    jcr:primaryType="sling:OrderedFolder">\n    <jcr:content\n'
            f'        jcr:primaryType="nt:unstructured"\n        jcr:title="{d.rsplit("/", 1)[1].capitalize()}"/>\n</jcr:root>\n')
    filters = f'    <filter root="{SITE}/{new_root}" mode="merge"/>\n' + ''.join(
        f'    <filter root="{d}" mode="merge"/>\n' for d in dam_folders)
else:
    filters = ''.join(f'    <filter root="{SITE}/{p}/jcr:content"/>\n' for p in pages)
files['META-INF/vault/filter.xml'] = (
    f'<?xml version="1.0" encoding="UTF-8"?>\n<workspaceFilter version="1.0">\n{filters}</workspaceFilter>\n')
files['META-INF/vault/properties.xml'] = f'''<?xml version="1.0" encoding="utf-8" standalone="no"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
<entry key="name">saudiaeds-pages-{name}</entry>
<entry key="group">{GROUP}</entry>
<entry key="version">{version}</entry>
<entry key="description">{f"New pages under {SITE}/{new_root} (merge: existing pages and assets are not changed) with their images" if new_root else "Page content (jcr:content only)"} for {', '.join(f'{SITE}/{p}' for p in pages)}, converted from the migrated pages.</entry>
<entry key="packageType">content</entry>
<entry key="requiresRoot">false</entry>
<entry key="allowIndexDefinitions">false</entry>
</properties>
'''

os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
zpath = os.path.join(HERE, 'dist', f'saudiaeds-pages-{name}-{version}.zip')
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    for rel in sorted(files):
        z.writestr(rel, files[rel])
    for rel in sorted(binaries):
        z.writestr(rel, binaries[rel])
print(zpath)
if new_root:
    print(f'  {SITE}/{new_root} (merge): {len(pages)} pages, {len(binaries)} images')
else:
    for p in pages:
        print(f'  {SITE}/{p}/jcr:content')
