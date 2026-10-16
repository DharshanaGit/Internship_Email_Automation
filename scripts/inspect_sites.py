import urllib.request
import ssl
import re
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def get_url(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
        return resp.read().decode('utf-8', errors='ignore')

print("1. Checking CAP APCFSS JS bundle...")
try:
    js = get_url("https://cap.apcfss.in/static/js/main.79df8067.js")
    endpoints = set(re.findall(r'["\'](/[^"\']+)["\']', js))
    for ep in sorted(endpoints):
        if any(w in ep.lower() for w in ['college', 'inst', 'get', 'api', 'report', 'master']):
            print("  EP:", ep)
except Exception as e:
    print("  CAP error:", e)

print("\n2. Checking other aptonline CET college master URLs...")
cet_codes = ['EAPCET', 'ECET', 'ICET', 'PGECET', 'EDCET', 'LAWCET']
for code in cet_codes:
    for sub in ['', '1']:
        url = f"https://{code.lower()}-sche{sub}.aptonline.in/{code}/collegeMaster"
        excel_url = f"https://{code.lower()}-sche{sub}.aptonline.in/{code}/collegeMaster/getExcelData"
        try:
            req = urllib.request.Request(excel_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
                data = r.read().decode('ISO-8859-1', errors='ignore')
                print(f"  {code} ({sub}): Status {r.status}, length {len(data)}")
        except Exception as e:
            pass
