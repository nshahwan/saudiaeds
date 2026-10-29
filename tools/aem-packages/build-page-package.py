"""Package migrated pages for the AEM author, one content node per page.

Reads the JCR the workspace converted from the local content (migration-work/jcr-content/<path>.xml,
the same conversion the import uses: html2md, then md2jcr with this project's component models)
and writes tools/aem-packages/dist/saudiaeds-pages-<name>-<version>.zip for Package Manager.

Each page maps to /content/saudiaeds/<path> (the site root, paths.json). The filter covers only
each page's jcr:content: installing replaces that page's content (its sections, blocks and page
properties) and never touches its child pages, other pages, assets or the page node itself.

usage: python3 tools/aem-packages/build-page-package.py <name> <page path>...
       e.g. build-page-package.py homepage en/index
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
name, pages = sys.argv[1], [p.strip('/') for p in sys.argv[2:]]
version = datetime.now(timezone.utc).strftime('%Y.%m.%d-%H%M')

files = {}
for page in pages:
    src = os.path.join(JCR, f'{page}.xml')
    if not os.path.isfile(src):
        sys.exit(f'{src} not found: convert the page first (the workspace writes it from content/{page}.plain.html)')
    xml = open(src, encoding='utf-8').read()
    if not re.search(r'jcr:primaryType="cq:Page"', xml) or '<jcr:content' not in xml:
        sys.exit(f'{src} is not a cq:Page docview')
    files[f'jcr_root{SITE}/{page}/.content.xml'] = xml

filters = ''.join(f'    <filter root="{SITE}/{p}/jcr:content"/>\n' for p in pages)
files['META-INF/vault/filter.xml'] = (
    f'<?xml version="1.0" encoding="UTF-8"?>\n<workspaceFilter version="1.0">\n{filters}</workspaceFilter>\n')
files['META-INF/vault/properties.xml'] = f'''<?xml version="1.0" encoding="utf-8" standalone="no"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
<entry key="name">saudiaeds-pages-{name}</entry>
<entry key="group">{GROUP}</entry>
<entry key="version">{version}</entry>
<entry key="description">Page content (jcr:content only) for {', '.join(f'{SITE}/{p}' for p in pages)}, converted from the migrated pages.</entry>
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
print(zpath)
for p in pages:
    print(f'  {SITE}/{p}/jcr:content')
