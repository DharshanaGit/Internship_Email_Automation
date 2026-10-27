import argparse
import sys
from pathlib import Path

# Enable unbuffered / line-buffered stdout for real-time progress logging
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from automation_engine.db.db_manager import (
    init_db,
    upsert_colleges_bulk,
    get_colleges_missing_website,
    update_college_website,
    upsert_contacts_bulk,
    get_contacts_by_state
)
from automation_engine.scrapers.aishe_scraper import AISHEScraper
from automation_engine.scrapers.ugc_scraper import UGCScraper
from automation_engine.scrapers.aicte_scraper import AICTEScraper
from automation_engine.missing_resolver.website_resolver import MissingWebsiteResolver
from automation_engine.crawler.college_crawler import CollegeCrawler
from automation_engine.extractor.contact_extractor import ContactExtractor

def run_state_pipeline(state_name=None, limit=200):
    """
    Executes the full automated pipeline for Pan-India (or a specific state if provided):
    1. Scrapes official AISHE, UGC, and AICTE directories across all India (no dummy data)
    2. Stores master records in PostgreSQL
    3. Resolves missing websites via Brave Search API & domain-matching rules evidence (DuckDB logged)
    4. Crawls official institutional websites
    5. Extracts, classifies (roles), and verifies (RFC syntax + dnspython DNS MX records)
    6. Stores lakhs-ready contact records in PostgreSQL
    """
    scope_label = state_name.upper() if state_name and state_name.lower() != "all india" else "ALL OVER INDIA"
    filter_state = None if (not state_name or state_name.lower() in ("all india", "all", "india")) else state_name

    print(f"\n{'='*75}")
    print(f"[START] INITIATING AUTOMATED PIPELINE FOR: {scope_label}")
    print(f"{'='*75}\n")

    # Step 1: PostgreSQL Schema Verification
    print(">>> STEP 1: Verifying PostgreSQL Schema & State Masters...")
    try:
        init_db()
    except Exception as e:
        print(f"[PostgreSQL Notice] {e}")

    # Step 2: Harvest Official Regulatory Portals (AISHE, UGC, AICTE)
    print("\n>>> STEP 2: Harvesting Official Regulatory Portals (AISHE, UGC, AICTE)...")
    harvested_colleges = []
    pre_extracted_contacts = []

    # 2a. UGC Portal (https://www.ugc.gov.in/universitydetails/)
    ugc = UGCScraper()
    try:
        ugc_colleges, ugc_contacts = ugc.scrape_all_universities(target_state=filter_state, limit=limit)
        harvested_colleges.extend(ugc_colleges)
        pre_extracted_contacts.extend(ugc_contacts)
    finally:
        ugc.close()

    # 2b. AISHE Portal (https://dashboard.aishe.gov.in/hedirectory/#/hedirectory)
    aishe = AISHEScraper()
    try:
        aishe_colleges = aishe.scrape_directory(target_state=filter_state, limit=limit)
        harvested_colleges.extend(aishe_colleges)
    finally:
        aishe.close()

    # 2c. AICTE Portal
    aicte = AICTEScraper()
    try:
        aicte_colleges = aicte.scrape_state_colleges(state_name=filter_state or "ALL", limit=limit)
        harvested_colleges.extend(aicte_colleges)
    finally:
        aicte.close()

    print(f"\nTotal Regulatory Institutions Harvested: {len(harvested_colleges)}")

    # Deduplicate colleges by name
    seen_names = set()
    unique_colleges = []
    for c in harvested_colleges:
        norm = c["college_name"].strip().lower()
        if norm not in seen_names:
            seen_names.add(norm)
            unique_colleges.append(c)

    print(f"Deduplicated Canonical Colleges: {len(unique_colleges)}")

    # Store master colleges in PostgreSQL
    try:
        upsert_colleges_bulk(unique_colleges)
        print(f"Stored {len(unique_colleges)} verified master colleges in PostgreSQL.")
    except Exception as e:
        print(f"[DB Notice] Colleges upsert: {e}")

    # Step 3: Missing Website Resolution (Brave Search API + Domain Matching + DuckDB Evidence)
    print("\n>>> STEP 3: Resolving Missing Websites with Brave Search & Domain Evidence...")
    resolver = MissingWebsiteResolver()
    crawler = CollegeCrawler()
    extractor = ContactExtractor()
    total_contacts = []

    # Include regulatory contacts found directly in UGC
    for rc in pre_extracted_contacts:
        valid_email = extractor.verify_email_syntax(rc["target_email"])
        if valid_email:
            has_mx = extractor.verify_dns_mx(valid_email)
            total_contacts.append({
                "college_id": None,
                "college_name": rc["college_name"],
                "target_email": valid_email,
                "role": rc["role"],
                "district_location": rc.get("district_location") or state_name,
                "contact_person": rc.get("contact_person") or "Leadership Office",
                "phone": rc.get("phone") or "",
                "email_syntax_valid": True,
                "dns_mx_verified": has_mx,
                "verification_status": "VERIFIED_MX" if has_mx else "SYNTAX_ONLY",
                "confidence_score": 1.0
            })

    try:
        # Check colleges and crawl official sites
        for col in unique_colleges[:limit]:
            website = col.get("website_url")
            if not website or not col.get("is_website_verified"):
                found_url, ok = resolver.resolve_website(
                    col.get("aishe_code"), col["college_name"], col.get("district", ""), state_name
                )
                if ok and found_url:
                    col["website_url"] = found_url
                    col["is_website_verified"] = True

            # Step 4 & 5: Deep Website Crawling & Contact Classification
            target_url = col.get("website_url")
            if target_url:
                pages = crawler.crawl_college_website(target_url, max_subpages=4)
                contacts = extractor.process_crawled_data(
                    col.get("aishe_code"), col["college_name"], col.get("district", ""), state_name, pages
                )
                total_contacts.extend(contacts)
    finally:
        resolver.close()
        crawler.close()

    # Step 6: Upsert Contacts into PostgreSQL and export to Excel/CSV
    print(f"\n>>> STEP 4: Storing {len(total_contacts)} Classified & Verified Contacts in PostgreSQL...")
    if total_contacts:
        try:
            upsert_contacts_bulk(total_contacts)
        except Exception as e:
            print(f"[DB Notice] Contacts bulk insert: {e}")

    # Export Pan-India Master Directory using Pandas + OpenPyXL
    import pandas as pd
    out_dir = Path("data")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    if total_contacts:
        df_contacts = pd.DataFrame(total_contacts)
        excel_path = out_dir / "Pan_India_Verified_Colleges_Contacts.xlsx"
        csv_path = out_dir / "Pan_India_Verified_Colleges_Contacts.csv"
        df_contacts.to_excel(excel_path, index=False)
        df_contacts.to_csv(csv_path, index=False)
        print(f"[Export] Saved verified contacts to {excel_path} and {csv_path}")

    if unique_colleges:
        df_colleges = pd.DataFrame(unique_colleges)
        col_excel_path = out_dir / "Pan_India_Master_Colleges.xlsx"
        col_csv_path = out_dir / "Pan_India_Master_Colleges.csv"
        df_colleges.to_excel(col_excel_path, index=False)
        df_colleges.to_csv(col_csv_path, index=False)
        print(f"[Export] Saved master colleges directory to {col_excel_path}")

    # Summary
    mx_count = sum(1 for c in total_contacts if c.get("dns_mx_verified"))
    print(f"\n{'='*75}")
    print(f"[COMPLETE] AUTOMATED PIPELINE EXECUTION COMPLETED")
    print(f"{'='*75}")
    print(f"State Targeted:          {state_name}")
    print(f"Colleges Ingested:       {len(unique_colleges)}")
    print(f"Total Contacts Verified: {len(total_contacts)}")
    print(f"DNS MX Receptive Emails: {mx_count} / {len(total_contacts)}")

    if total_contacts:
        print("\nVerified Contact Output Preview:")
        for idx, ct in enumerate(total_contacts[:6], 1):
            mx_icon = "MX-OK" if ct.get("dns_mx_verified") else "SYNTAX"
            print(f" {idx}. [{ct['role']}] {ct['target_email']} ({mx_icon}) | {ct['college_name']} | {ct.get('district_location')} | Phone: {ct.get('phone')}")

    return {
        "colleges": unique_colleges,
        "contacts": total_contacts
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pan-India College Data Automation Pipeline")
    parser.add_argument("--state", type=str, default="All India", help="Indian State or 'All India' for Pan-India harvest")
    parser.add_argument("--limit", type=int, default=100, help="Number of institutions to process")
    args = parser.parse_args()

    run_state_pipeline(state_name=args.state, limit=args.limit)
