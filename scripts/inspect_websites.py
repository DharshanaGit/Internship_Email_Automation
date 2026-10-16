import json

with open('scripts/aggregate_all_cets.py', 'r') as f:
    pass

import urllib.request, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

base = "https://api.cap.apcfss.in/oamreadapi/"
endpoints = [
    "oam-public/eapcet-clg-home-page-details",
    "oam-public/eapcet-bipc-clg-home-page-details",
    "oam-public/ecet-clg-home-page-details",
    "oam-public/ecet-phm-clg-home-page-details",
    "oam-public/icet-clg-home-page-details",
    "oam-public/edcet-clg-home-page-details",
    "oam-public/lawcet-clg-home-page-details",
    "oam-public/pgcet-clg-home-page-details",
    "oam-public/pgecet-clg-home-page-details",
    "oam-public/barch-clg-home-page-details"
]

all_colleges = {}

for ep in endpoints:
    url = base + ep
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
            res = json.loads(r.read().decode('utf-8'))
            items = res.get('data', [])
            for item in items:
                code = item.get('inst_code') or item.get('college_code')
                name = item.get('inst_name') or item.get('college_name')
                key = (code, name)
                if key not in all_colleges:
                    all_colleges[key] = item
    except Exception as e:
        pass

with_site = 0
with_email = 0
with_phone = 0

sample_sites = []
for (code, name), item in all_colleges.items():
    site = item.get('website') or item.get('inst_website')
    email = item.get('e_mail') or item.get('email')
    phone = item.get('ph_no') or item.get('ao_mobile_no') or item.get('principal_mobile_no')
    if site and site.strip() and site.strip().lower() not in ['na', 'null', 'nil', '-', 'no']:
        with_site += 1
        if len(sample_sites) < 15:
            sample_sites.append((code, name, site.strip(), email))
    if email and email.strip() and email.strip().lower() not in ['na', 'null', 'nil', '-']:
        with_email += 1
    if phone:
        with_phone += 1

print(f"Total Colleges: {len(all_colleges)}")
print(f"Colleges with Official Email: {with_email}")
print(f"Colleges with Phone/Mobile: {with_phone}")
print(f"Colleges with Website: {with_site}")
print("\nSample Sites:")
for s in sample_sites:
    print(s)
