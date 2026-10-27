import httpx
from bs4 import BeautifulSoup
import re

url = "https://facilities.aicte-india.org/dashboard/pages/angulardashboard.php"
r = httpx.get(url, verify=False, timeout=15.0, headers={"User-Agent": "Mozilla/5.0"})
soup = BeautifulSoup(r.text, "lxml")

print("Scripts in angulardashboard.php:")
for s in soup.find_all("script", src=True):
    src = s["src"]
    print("  script src:", src)

# Also check AICTE institutions page:
aicte_url = "https://www.aicte.gov.in/education/institutions/Universities"
r2 = httpx.get(aicte_url, verify=False, timeout=15.0, headers={"User-Agent": "Mozilla/5.0"})
soup2 = BeautifulSoup(r2.text, "lxml")
content_div = soup2.find("div", class_="node__content") or soup2.find("article") or soup2.find("main")
if content_div:
    print("\nAICTE Institutions/Universities Content Snippet:")
    print(content_div.get_text(separator="\n", strip=True)[:1000])
