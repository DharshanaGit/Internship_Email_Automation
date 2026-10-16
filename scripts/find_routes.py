import urllib.request, ssl, re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://cap.apcfss.in/static/js/main.a387af77.js'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
    js = resp.read().decode('utf-8', errors='ignore')

routes = re.findall(r'path:\s*["\'](/[^"\']+)["\']', js)
print("Routes found:", len(routes))
for r in sorted(set(routes)):
    print("  ", r)

# Also search for "institutes" or "colleges" or "course"
words = ['institute', 'college', 'course', 'district', 'affil']
for w in words:
    matches = set(re.findall(r'["\'](/[^"\']*' + w + r'[^"\']*)["\']', js, re.IGNORECASE))
    print(f"\nPaths containing '{w}':", len(matches))
    for m in sorted(matches)[:15]:
        print("  ", m)
