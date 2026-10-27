import httpx
import re

url = "https://dashboard.aishe.gov.in/hedirectory/main.6a3f3221b4aecf63.js"
r = httpx.get(url, verify=False, timeout=30.0)

matches = re.finditer(r'getCollegeList', r.text)
for m in matches:
    start = max(0, m.start() - 200)
    end = min(len(r.text), m.end() + 300)
    print("--- FOUND getCollegeList CONTEXT ---")
    print(r.text[start:end])
