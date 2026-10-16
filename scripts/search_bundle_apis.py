import re

with open('scripts/inspect_cap.py', 'r') as f:
    pass

import urllib.request, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://cap.apcfss.in/static/js/main.a387af77.js'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
    js = resp.read().decode('utf-8', errors='ignore')

# Find all matches for oamreadapi, oamapi, AFFL_URL, or getDegreeCollegesCoursesList
patterns = ['oamreadapi', 'oamapi', 'AFFL_URL', 'getDegreeCollegesCoursesList', 'inst_website', 'college']
for p in patterns:
    matches = [m.start() for m in re.finditer(p, js, re.IGNORECASE)]
    print(f"\nPattern: {p} (count: {len(matches)})")
    for idx in matches[:5]:
        snippet = js[max(0, idx-150):min(len(js), idx+200)]
        print("  Snippet:", snippet.replace('\n', ' '))
