import re
import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://cap.apcfss.in/static/js/main.a387af77.js'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
    js = resp.read().decode('utf-8', errors='ignore')

matches = set(re.findall(r'["\']([a-zA-Z0-9_\-/]*clg-home-page-details)["\']', js))
print("Endpoints with clg-home-page-details:", len(matches))
for m in sorted(matches):
    print("  ", m)

matches2 = set(re.findall(r'["\']([a-zA-Z0-9_\-/]*college[a-zA-Z0-9_\-/]*)["\']', js, re.IGNORECASE))
print("\nOther college endpoints:", len(matches2))
for m in sorted(matches2)[:20]:
    print("  ", m)

matches3 = set(re.findall(r'["\']([a-zA-Z0-9_\-/]*inst-home-page-details)["\']', js, re.IGNORECASE))
print("\nEndpoints with inst-home-page-details:", len(matches3))
for m in sorted(matches3):
    print("  ", m)
