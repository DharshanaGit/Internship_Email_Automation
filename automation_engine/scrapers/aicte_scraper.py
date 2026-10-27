import httpx
import re
from bs4 import BeautifulSoup
from automation_engine.config import USER_AGENT, REQUEST_TIMEOUT

class AICTEScraper:
    def __init__(self):
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/plain, */*",
        }
        self.client = httpx.Client(timeout=REQUEST_TIMEOUT, verify=False)

    def scrape_state_colleges(self, state_name, limit=500):
        """
        Scrapes AICTE approved technical institutes directory for a specified state.
        """
        print(f"[AICTE Scraper] Querying AICTE approved directory for: {state_name}...")
        colleges = []
        try:
            # AICTE directory API endpoint
            payload = {
                "state": state_name,
                "year": "2024-2025",
                "program": "Engineering & Technology,Management,MCA"
            }
            # AICTE data query
            resp = self.client.get(
                f"https://facilities.aicte-india.org/dashboard/pages/approved-institutes.php?state={state_name}",
                headers=self.headers
            )
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")
                table = soup.find("table")
                if table:
                    for row in table.find_all("tr")[1:limit+1]:
                        cols = [td.get_text(strip=True) for td in row.find_all("td")]
                        if len(cols) >= 3:
                            aicte_id = cols[0]
                            name = cols[1]
                            district = cols[2] if len(cols) > 2 else ""
                            colleges.append({
                                "aishe_code": f"AICTE-{aicte_id}",
                                "ugc_id": None,
                                "aicte_id": aicte_id,
                                "college_name": name,
                                "state": state_name,
                                "district": district,
                                "location": f"{district}, {state_name}".strip(", "),
                                "affiliating_university": "",
                                "category": "AICTE Approved Technical Institute",
                                "website_url": "",
                                "website_status": "UNKNOWN",
                                "is_website_verified": False,
                                "phone": "",
                                "address": f"{district}, {state_name}",
                                "source": "AICTE"
                            })
        except Exception as e:
            print(f"[AICTE Scraper] Notice: {e}")

        print(f"[AICTE Scraper] Harvested {len(colleges)} technical institutes for {state_name}.")
        return colleges

    def close(self):
        self.client.close()
