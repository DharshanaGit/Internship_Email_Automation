import urllib.request
import ssl
import json

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
            print(f"{ep}: {len(items)} records")
            for item in items:
                code = item.get('inst_code') or item.get('college_code')
                name = item.get('inst_name') or item.get('college_name')
                key = (code, name)
                if key not in all_colleges:
                    all_colleges[key] = {
                        'source': ep,
                        'data': item
                    }
    except Exception as e:
        print(f"Error {ep}: {e}")

print("\nTotal unique colleges across all AP CETs:", len(all_colleges))
