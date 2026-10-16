import urllib.request
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://cap.apcfss.in/static/js/main.a387af77.js'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        js = resp.read().decode('utf-8', errors='ignore')
        print('JS size:', len(js))
        
        # Search for api, http, college, report, institute endpoints
        endpoints = set(re.findall(r'["\'](/[a-zA-Z0-9_\-\./]+)["\']', js))
        relevant = [e for e in endpoints if any(k in e.lower() for k in ['college', 'inst', 'report', 'admiss', 'api', 'list', 'master', 'get'])]
        print('Relevant endpoints found:', len(relevant))
        for r in sorted(relevant)[:40]:
            print('  ', r)

        # Search for full URLs
        urls = set(re.findall(r'https?://[^\s"\'`<>]+', js))
        print('\nFull URLs found:', len(urls))
        for u in sorted(urls):
            print('  ', u)

        # Search for axios or fetch calls
        api_calls = re.findall(r'(?:get|post|put)\s*\(\s*[`\'"]([^`\'"]+)[`\'"]', js, re.IGNORECASE)
        print('\nAPI calls found:', len(api_calls))
        for a in set(api_calls):
            print('  ', a)
except Exception as e:
    print('Error:', e)
