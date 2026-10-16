import urllib.request
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

base = "https://api.cap.apcfss.in/oamreadapi/"
endpoints = [
    "oam-public/eapcet-clg-home-page-details",
    "oam-public/institutes-branches?cetName=EAPCET",
    "university-wise-colleges",
    "oam-public/icet-clg-home-page-details",
    "oam-public/ecet-clg-home-page-details",
    "oam-public/pgcet-clg-home-page-details"
]

for ep in endpoints:
    url = base + ep
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json'
        })
        with urllib.request.urlopen(req, context=ctx, timeout=10) as r:
            data = json.loads(r.read().decode('utf-8'))
            print(f"SUCCESS: {ep} -> Type: {type(data)}")
            if isinstance(data, list):
                print(f"  Count: {len(data)}")
                if len(data) > 0:
                    print(f"  Sample keys: {list(data[0].keys()) if isinstance(data[0], dict) else data[0]}")
                    print(f"  Sample record: {json.dumps(data[0], indent=2)[:300]}")
            elif isinstance(data, dict):
                print(f"  Keys: {list(data.keys())}")
                for k, v in data.items():
                    if isinstance(v, list):
                        print(f"    Sublist '{k}' count: {len(v)}")
                        if len(v) > 0:
                            print(f"    Sample: {json.dumps(v[0], indent=2)[:200]}")
    except Exception as e:
        print(f"FAILED: {ep} -> {e}")
