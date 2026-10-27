import httpx
import re

url = "https://dashboard.aishe.gov.in/hedirectory/main.6a3f3221b4aecf63.js"
r = httpx.get(url, verify=False, timeout=30.0)
print("Length of bundle:", len(r.text))

# Search for any endpoints matching url patterns
matches = re.findall(r'["\'](https?://[^"\']+)[^"\']*["\']', r.text)
matches += re.findall(r'["\'](/[^"\']*(?:institution|college|university|directory|district|state|count|filter)[^"\']*)["\']', r.text, re.IGNORECASE)

unique = set()
for m in matches:
    if any(k in m.lower() for k in ["institution", "college", "university", "district", "state", "nic.in", "aishe"]):
        unique.add(m)

print(f"Total matching endpoints: {len(unique)}")
for u in sorted(unique):
    print(" ->", u)
