import httpx
import re

scripts = ['runtime.e9922a690e161171.js', 'polyfills.bb397ab6c59be313.js', 'scripts.b320a513c5788673.js', 'main.6a3f3221b4aecf63.js']

for s in scripts:
    url = f"https://dashboard.aishe.gov.in/hedirectory/{s}"
    r = httpx.get(url, verify=False, timeout=30.0)
    for m in re.finditer(r'https?://[^"\'\s)]+', r.text):
        matched = m.group(0)
        if any(term in matched.lower() for term in ['aishe', 'nic.in', 'api', 'management']):
            print(f"[{s}] {matched}")
