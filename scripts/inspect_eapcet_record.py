import urllib.request
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://api.cap.apcfss.in/oamreadapi/oam-public/eapcet-clg-home-page-details"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, context=ctx) as r:
    data = json.loads(r.read().decode('utf-8'))

print("Total records:", len(data['data']))
first = data['data'][0]
print(json.dumps(first, indent=2))
