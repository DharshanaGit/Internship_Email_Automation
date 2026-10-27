import httpx
import re
from automation_engine.config import USER_AGENT, REQUEST_TIMEOUT

class AISHEScraper:
    """
    Scraper for official AISHE Higher Education Directory:
    Portal: https://dashboard.aishe.gov.in/hedirectory/#/hedirectory
    Backend API: https://pdf.aishe.nic.in/aisheinstitutemanagement/
    """
    def __init__(self):
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/plain, */*",
            "Origin": "https://dashboard.aishe.gov.in",
            "Referer": "https://dashboard.aishe.gov.in/"
        }
        self.client = httpx.Client(timeout=REQUEST_TIMEOUT, verify=False, follow_redirects=True)

    def scrape_directory(self, target_state=None, limit=500):
        """
        Fetches verified institutions from the official AISHE HE Directory API.
        Extracts aisheCode, name, stateName, districtName, webSite, address1, institutionType.
        """
        print("[AISHE Scraper] Fetching directory records from AISHE official API...")
        colleges = []

        url = "https://pdf.aishe.nic.in/aisheinstitutemanagement/institutionDirectory%20/getNationalUniversity?universityName=OWM2NTVhYzU5YjI3N2FhMGMzN2Q5NDQ4OWU0YzI5Mzk6OmIxMmMxMTQwYzVhNjQ0ODliYmNkZWIxMDZkYjBmYTg4NTM1Y2I3MzE1YTU5OGQ3YzQ2YzYwYjJhNmM3ODRhYTI6OlhhS1ZVTW9GSHc2MFFpTUY1NE43MGc9PQ==&surveyYear=YzFkODM1YzE1NzZjMzIzMGI1NjIxNGQ0MzlmZmVlNGQ6OjU3YzJkMTJiNTBiNmRkMGE3MDQwYmJmNWFmMmFjZDAwYjAzNmQxMTc5MzMzMTJmNGI5OTJhMmZjOWU5MzQ2NjQ6OjBMODJVWklhUG1IYjRmSVc3Wk5kM2c9PQ=="

        try:
            resp = self.client.get(url, headers=self.headers)
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("institutionDirectoryDto", [])
                print(f"[AISHE Scraper] Harvested {len(items)} official AISHE institution records.")

                for it in items:
                    state_name = it.get("stateName") or ""
                    if target_state and target_state.lower() not in state_name.lower():
                        continue

                    name = it.get("name") or ""
                    if not name:
                        continue

                    website = it.get("webSite") or ""
                    if website and not website.startswith("http"):
                        website = f"https://{website}"

                    aishe_code = it.get("aisheCode") or f"AISHE-{re.sub(r'[^A-Za-z0-9]', '', name)[:15]}"
                    district = it.get("districtName") or ""
                    address = it.get("address1") or f"{district}, {state_name}"
                    inst_type = it.get("institutionType") or "Higher Education Institution"

                    colleges.append({
                        "aishe_code": aishe_code,
                        "ugc_id": None,
                        "aicte_id": None,
                        "college_name": name,
                        "state": state_name,
                        "district": district,
                        "location": f"{district}, {state_name}".strip(", "),
                        "affiliating_university": it.get("universityName") or "",
                        "category": inst_type,
                        "website_url": website,
                        "website_status": "ACTIVE" if website else "UNKNOWN",
                        "is_website_verified": bool(website),
                        "phone": "",
                        "address": address,
                        "source": "AISHE"
                    })

                    if len(colleges) >= limit:
                        break
        except Exception as e:
            print(f"[AISHE Scraper] Error: {e}")

        print(f"[AISHE Scraper] Returning {len(colleges)} verified records.")
        return colleges

    def close(self):
        self.client.close()
