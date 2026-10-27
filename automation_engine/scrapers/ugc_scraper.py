import httpx
import re
from automation_engine.config import USER_AGENT, REQUEST_TIMEOUT

class UGCScraper:
    """
    Scraper for official UGC Portal: https://www.ugc.gov.in/universitydetails/
    Fetches official verified Central, State, Private, and Deemed Universities.
    Directly extracts official websites, VC contact details, Registrar details, and Nodal officers.
    """
    def __init__(self):
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/plain, */*"
        }
        self.client = httpx.Client(timeout=REQUEST_TIMEOUT, verify=False, follow_redirects=True)

    def scrape_all_universities(self, target_state=None, limit=1000):
        """
        Fetches official recognized universities across all 4 UGC categories:
        1: Central Universities
        2: State Universities
        3: State Private Universities
        4: Deemed to be Universities
        """
        print(f"[UGC Scraper] Connecting to UGC Official API (https://www.ugc.gov.in/universitydetails/)...")
        colleges = []
        raw_contacts = []

        type_map = {
            1: "Central University",
            2: "State University",
            3: "State Private University",
            4: "Deemed to be University"
        }

        for type_id, cat_name in type_map.items():
            url = f"https://www.ugc.gov.in/universitydetails/Getuniversity_details?unitypeID={type_id}"
            try:
                resp = self.client.get(url, headers=self.headers)
                if resp.status_code == 200:
                    data = resp.json()
                    items = data.get("List", [])
                    print(f"[UGC Scraper] Harvested {len(items)} records for category '{cat_name}'.")

                    for item in items:
                        state_val = (item.get("state") or "").strip()
                        if target_state and target_state.lower() not in state_val.lower():
                            continue

                        name = (item.get("uni_name") or "").strip().strip('"')
                        if not name:
                            continue

                        website = (item.get("url") or "").strip()
                        if website and not website.startswith("http"):
                            website = f"https://{website}"

                        ugc_id = str(item.get("ID") or "")
                        zip_code = (item.get("Zip") or "").strip()
                        address = (item.get("address") or "").strip()

                        colleges.append({
                            "aishe_code": item.get("AIshe_code") or f"UGC-{ugc_id}-{re.sub(r'[^A-Za-z0-9]', '', name)[:12]}",
                            "ugc_id": ugc_id,
                            "aicte_id": None,
                            "college_name": name,
                            "state": state_val or "India",
                            "district": "",
                            "location": f"{address}, {state_val}".strip(", "),
                            "affiliating_university": "UGC Recognized University",
                            "category": cat_name,
                            "website_url": website,
                            "website_status": "ACTIVE" if website else "UNKNOWN",
                            "is_website_verified": bool(website),
                            "phone": item.get("UPNO") or item.get("VCMOB") or item.get("REMOB") or "",
                            "address": f"{address} {zip_code}".strip(),
                            "source": "UGC"
                        })

                        # Collect embedded regulatory contacts
                        if item.get("VCE_ML"):
                            raw_contacts.append({
                                "college_name": name,
                                "target_email": item.get("VCE_ML").strip(),
                                "role": "Principal / Director",
                                "contact_person": item.get("NM_VC") or "Vice Chancellor",
                                "phone": item.get("VCMOB") or item.get("VCPNO") or "",
                                "district_location": f"{address}, {state_val}".strip(", ")
                            })

                        if item.get("RE_ML"):
                            raw_contacts.append({
                                "college_name": name,
                                "target_email": item.get("RE_ML").strip(),
                                "role": "Administrative / Office",
                                "contact_person": item.get("NM_REG") or "Registrar",
                                "phone": item.get("REMOB") or item.get("RPNO") or "",
                                "district_location": f"{address}, {state_val}".strip(", ")
                            })

                        if item.get("Nodal_Email"):
                            raw_contacts.append({
                                "college_name": name,
                                "target_email": item.get("Nodal_Email").strip(),
                                "role": "Administrative / Office",
                                "contact_person": item.get("NM_Nodal") or "Nodal Officer",
                                "phone": item.get("Nodal_Mob") or item.get("Nodal_Phn") or "",
                                "district_location": f"{address}, {state_val}".strip(", ")
                            })

                        if len(colleges) >= limit:
                            break
            except Exception as e:
                print(f"[UGC Scraper] Error querying type {type_id}: {e}")

        print(f"[UGC Scraper] Total colleges harvested: {len(colleges)}, embedded contacts: {len(raw_contacts)}")
        return colleges, raw_contacts

    def close(self):
        self.client.close()
