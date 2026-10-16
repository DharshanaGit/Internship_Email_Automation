import urllib.request
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request('https://cap.apcfss.in/static/js/main.79df8067.js', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, context=ctx) as r:
    js = r.read().decode('utf-8', errors='ignore')

matches = sorted(set(re.findall(r'CONTEXT_READ_URL\s*[\+\,]\s*["\']([^"\']+)["\']', js)))
print("--- ALL COLLEGE/INST ENDPOINTS ---")
for m in matches:
    if any(k in m.lower() for k in ['college', 'inst', 'clg', 'cet', 'profile', 'affl', 'report']):
        print(" ", m)

matches_affl = sorted(set(re.findall(r'AFFL_URL\s*[\+\,]\s*["\']([^"\']+)["\']', js)))
print("--- ALL AFFL ENDPOINTS ---")
for m in matches_affl:
    print(" ", m)
