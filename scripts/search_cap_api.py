import urllib.request
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request('https://cap.apcfss.in/static/js/main.79df8067.js', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, context=ctx) as r:
    js = r.read().decode('utf-8', errors='ignore')

# Search for any string following AFFL_URL, CONTEXT_READ_URL, CONTEXT_URL
patterns = [
    r'AFFL_URL\s*[\+\,]\s*["\']([^"\']+)["\']',
    r'CONTEXT_READ_URL\s*[\+\,]\s*["\']([^"\']+)["\']',
    r'CONTEXT_URL\s*[\+\,]\s*["\']([^"\']+)["\']',
    r'["\'](/api/[^"\']+)["\']',
    r'["\'](/oam[^"\']+)["\']',
    r'["\'](/affiliation[^"\']+)["\']'
]

for pat in patterns:
    res = set(re.findall(pat, js))
    if res:
        print(f"Pattern {pat} found ({len(res)}):")
        for x in sorted(res)[:20]:
            print("  ", x)
