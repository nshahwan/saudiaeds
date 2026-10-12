"""Turn an interactive-session DOM capture into a script-free live snapshot (content source
for gen-pages and the 8792 snapshot server). Usage: snapshot.py <slug> <width>"""
import re
import sys

slug, w = sys.argv[1], sys.argv[2]
G = f'/backups/nshahwan/saudiaeds/repo/stardust/replica/gates/{slug}-{w}/'
s = open(G + 'live-capture/dom.html', encoding='utf-8').read()
s = re.sub(r'<script\b[^>]*>.*?</script>', '', s, flags=re.S | re.I)
s = re.sub(r'<head([^>]*)>', r'<head\1><base href="https://www.saudia.com/">', s, count=1)
open(G + 'live-snapshot.html', 'w', encoding='utf-8').write(s)
print(slug, w, len(s))
