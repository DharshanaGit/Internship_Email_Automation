"""
Periodic Monthly College Website Monitor & Live Audit Engine.
Executes periodic monthly checks against official college websites:
- Verifies website availability (online/offline).
- Extracts and verifies current live contacts (emails, phones, TPO/Principal roles).
- Performs RFC-5322 syntax validation and live DNS MX resolution.
- Computes deltas against PostgreSQL records and logs changes into `change_audit_logs`.
- Updates `colleges.updated_at` and `college_contacts.updated_at` (live data, not static).
- Records crawl jobs in `crawl_jobs`.
"""

import sys
import os
import re
import json
import time
import asyncio
import urllib.parse
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict
import aiohttp
from bs4 import BeautifulSoup
import dns.resolver
from email_validator import validate_email, EmailNotValidError
import psycopg
from psycopg.rows import dict_row

# Line buffering for immediate console streaming
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from automation_engine.config import (
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_DB,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    USER_AGENT
)

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
PHONE_REGEX = re.compile(r'(?:\+91[\-\s]?)?[6-9]\d{9}|(?:0\d{2,4}[\-\s]?\d{6,8})')

EXCLUDED_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js', '.ico', '.pdf', '.docx')
BLACKLIST_DOMAINS = {
    'sentry.io', 'example.com', 'w3.org', 'schema.org', 'domain.com', 'test.com',
    'bootstrap.com', 'fontawesome.com', 'google.com', 'facebook.com', 'twitter.com',
    'instagram.com', 'youtube.com', 'linkedin.com', 'wordpress.org', 'wordpress.com'
}

TARGET_SUBPAGES = ['/contact', '/contact-us', '/placement', '/tpo', '/faculty']

def get_pg_connection():
    return psycopg.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        dbname=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        connect_timeout=10,
        options="-c search_path=college_data,public",
        row_factory=dict_row
    )

class PoliteLiveMonitor:
    def __init__(self, max_concurrency=25, min_delay_per_host=1.5, request_timeout=7):
        self.semaphore = asyncio.Semaphore(max_concurrency)
        self.min_delay = min_delay_per_host
        self.timeout = aiohttp.ClientTimeout(total=request_timeout, connect=4.0)
        self.host_last_request = defaultdict(float)
        self.host_locks = defaultdict(asyncio.Lock)
        self.mx_cache = {}
        self.dns_resolver = dns.resolver.Resolver()
        self.dns_resolver.lifetime = 3.0
        self.dns_resolver.timeout = 2.5

    async def _throttle_host(self, host):
        async with self.host_locks[host]:
            now = time.time()
            elapsed = now - self.host_last_request[host]
            if elapsed < self.min_delay:
                await asyncio.sleep(self.min_delay - elapsed)
            self.host_last_request[host] = time.time()

    async def fetch_page(self, session, url):
        try:
            parsed = urllib.parse.urlparse(url)
            host = parsed.netloc.lower()
            if not host:
                return None, "INVALID_URL"
            await self._throttle_host(host)

            async with self.semaphore:
                async with session.get(url, timeout=self.timeout, ssl=False, allow_redirects=True) as resp:
                    if resp.status == 200:
                        ct = resp.headers.get("content-type", "").lower()
                        if "text/html" in ct or "text/plain" in ct:
                            text = await resp.text(errors="ignore")
                            return text, resp.status
                    return None, str(resp.status)
        except asyncio.TimeoutError:
            return None, "TIMEOUT"
        except Exception:
            return None, "ERROR"

    def check_dns_mx(self, email_str):
        try:
            domain = email_str.split("@")[-1].lower()
            if domain in self.mx_cache:
                return self.mx_cache[domain]
            records = self.dns_resolver.resolve(domain, 'MX')
            has_mx = len(records) > 0
            self.mx_cache[domain] = has_mx
            return has_mx
        except Exception:
            domain = email_str.split("@")[-1].lower()
            self.mx_cache[domain] = False
            return False

    async def check_dns_mx_async(self, email_str):
        domain = email_str.split("@")[-1].lower()
        if domain in self.mx_cache:
            return self.mx_cache[domain]
        try:
            loop = asyncio.get_running_loop()
            return await loop.run_in_executor(None, self.check_dns_mx, email_str)
        except Exception:
            self.mx_cache[domain] = False
            return False

    def validate_syntax(self, email_str):
        try:
            v = validate_email(email_str, check_deliverability=False)
            return v.normalized
        except EmailNotValidError:
            return None

    def classify_role(self, email_str, context_text=""):
        em = email_str.lower()
        ctx = context_text.lower()
        if any(k in em for k in ["tpo", "placement", "placements", "recruit", "career", "training"]):
            return "Training & Placement Officer (TPO)"
        if any(k in em for k in ["principal", "director", "head", "vc", "dean.acad", "rector", "provost"]):
            return "Principal / Director"
        if any(k in em for k in ["hod", "department", "prof", "dean"]):
            return "Dean / HOD"
        if "placement" in ctx or "tpo" in ctx:
            return "Training & Placement Officer (TPO)"
        if "principal" in ctx or "director" in ctx:
            return "Principal / Director"
        if "hod" in ctx or "department" in ctx:
            return "Dean / HOD"
        return "Administrative / Office"

    def extract_contacts(self, html_text):
        if not html_text:
            return [], [], ""
        soup = BeautifulSoup(html_text, "lxml")
        for s in soup(["script", "style", "noscript", "svg", "header", "footer"]):
            s.decompose()
        page_text = soup.get_text(separator=" ", strip=True)

        raw_emails = set(EMAIL_REGEX.findall(html_text))
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if href.lower().startswith("mailto:"):
                clean = href[7:].split("?")[0].strip()
                if clean:
                    raw_emails.add(clean)

        valid_emails = set()
        for em in raw_emails:
            clean = em.lower().strip(".,;:()<>[]'\"")
            if any(clean.endswith(ext) for ext in EXCLUDED_EXTENSIONS):
                continue
            parts = clean.split("@")
            if len(parts) != 2:
                continue
            if parts[1] in BLACKLIST_DOMAINS:
                continue
            if any(x in clean for x in ['example', 'someone', 'yourname', 'domain']):
                continue
            val = self.validate_syntax(clean)
            if val:
                valid_emails.add(val)

        phones = set()
        for p in PHONE_REGEX.findall(page_text):
            p_clean = re.sub(r'[^\d+]', '', p)
            if len(p_clean) >= 10:
                phones.add(p_clean)

        return list(valid_emails), list(phones), page_text

    async def crawl_live(self, session, college):
        base_url = college.get("website_url", "").strip()
        if not base_url:
            return [], "NO_URL"

        if not base_url.startswith("http"):
            base_url = f"https://{base_url}"

        parsed = urllib.parse.urlparse(base_url)
        base_origin = f"{parsed.scheme}://{parsed.netloc}"

        subpage_urls = [base_origin]
        for sub in TARGET_SUBPAGES:
            subpage_urls.append(urllib.parse.urljoin(base_origin, sub))
        subpage_urls = subpage_urls[:5]

        college_emails = set()
        college_phones = set()
        combined_text = ""
        homepage_status = None

        for idx_p, url in enumerate(subpage_urls):
            html, status = await self.fetch_page(session, url)
            if idx_p == 0:
                homepage_status = status
            if html:
                emails, phones, text = self.extract_contacts(html)
                college_emails.update(emails)
                college_phones.update(phones)
                combined_text += " " + text[:1000]
            elif idx_p == 0 and status in ("TIMEOUT", "ERROR", "INVALID_URL"):
                break

        contacts = []
        primary_phone = list(college_phones)[0] if college_phones else ""

        for em in college_emails:
            has_mx = await self.check_dns_mx_async(em)
            role = self.classify_role(em, combined_text)
            contacts.append({
                "college_id": college["id"],
                "college_name": college["college_name"],
                "target_email": em,
                "role": role,
                "district_location": f"{college.get('district', '')}, {college.get('state', '')}".strip(", "),
                "contact_person": role,
                "phone": primary_phone,
                "email_syntax_valid": True,
                "dns_mx_verified": has_mx,
                "verification_status": "VERIFIED_MX" if has_mx else "SYNTAX_ONLY",
                "confidence_score": 1.00 if has_mx else 0.70
            })

        return contacts, homepage_status

async def run_monthly_audit(target_state="Delhi", batch_limit=500):
    start_time = time.time()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print(f"\n{'='*75}")
    print(f"[PERIODIC MONITOR] MONTHLY LIVE COLLEGE AUDIT & CHANGE DETECTION")
    print(f"  Execution Time: {now_str}")
    print(f"  Target State:   {target_state or 'ALL STATES'}")
    print(f"  Batch Limit:    {batch_limit} colleges")
    print(f"  Mode:           LIVE (Checks current website status, MX deliverability, & deltas)")
    print(f"{'='*75}\n")

    # Step 1: Fetch target colleges
    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT id, college_name, state, district, website_url, website_status
                FROM colleges
                WHERE website_url IS NOT NULL AND website_url != ''
            """
            params = []
            if target_state and target_state.lower() != "all india":
                query += " AND state ILIKE %s"
                params.append(f"%{target_state}%")
            query += " ORDER BY updated_at ASC NULLS FIRST, college_name ASC LIMIT %s;"
            params.append(batch_limit)

            cur.execute(query, params)
            colleges = cur.fetchall()

            # Pre-load existing contacts map for delta change tracking
            college_ids = [c["id"] for c in colleges]
            cur.execute("""
                SELECT college_id, target_email, role, phone, dns_mx_verified
                FROM college_contacts
                WHERE college_id = ANY(%s);
            """, (college_ids,))
            existing_contacts_by_col = defaultdict(dict)
            for row in cur.fetchall():
                existing_contacts_by_col[row["college_id"]][row["target_email"]] = row

    total_targeted = len(colleges)
    print(f"[Target Batch] Selected {total_targeted} colleges for live monthly verification.\n")
    if total_targeted == 0:
        print("[Notice] No colleges found for targeted criteria.")
        return

    monitor = PoliteLiveMonitor(max_concurrency=25, min_delay_per_host=1.5, request_timeout=7)
    headers = {"User-Agent": USER_AGENT}
    connector = aiohttp.TCPConnector(limit=25, ssl=False)

    queue = asyncio.Queue()
    for col in colleges:
        queue.put_nowait(col)

    all_discovered_contacts = []
    audit_logs_to_insert = []
    status_updates = []
    processed_count = 0
    lock = asyncio.Lock()

    async def worker(session):
        nonlocal processed_count
        while not queue.empty():
            try:
                col = queue.get_nowait()
            except asyncio.QueueEmpty:
                break

            try:
                live_contacts, site_status = await monitor.crawl_live(session, col)
                async with lock:
                    status_updates.append((
                        'ACTIVE' if site_status == 200 else ('ERROR' if site_status in ('TIMEOUT', 'ERROR') else str(site_status)),
                        col["id"]
                    ))

                    # Detect change in website health
                    prev_status = col.get("website_status")
                    curr_status = 'ACTIVE' if site_status == 200 else str(site_status)
                    if prev_status and prev_status != curr_status:
                        audit_logs_to_insert.append((
                            col["id"],
                            'WEBSITE_STATUS_CHANGE',
                            json.dumps({"old_status": prev_status}),
                            json.dumps({"new_status": curr_status, "http_status": site_status})
                        ))

                    # Delta contact comparison
                    existing = existing_contacts_by_col.get(col["id"], {})
                    for nc in live_contacts:
                        all_discovered_contacts.append(nc)
                        em = nc["target_email"]
                        if em not in existing:
                            audit_logs_to_insert.append((
                                col["id"],
                                'NEW_CONTACT_DISCOVERED',
                                None,
                                json.dumps({
                                    "email": em, "role": nc["role"], "phone": nc["phone"],
                                    "mx_verified": nc["dns_mx_verified"]
                                })
                            ))
                        else:
                            old = existing[em]
                            if old["role"] != nc["role"]:
                                audit_logs_to_insert.append((
                                    col["id"],
                                    'CONTACT_ROLE_UPDATED',
                                    json.dumps({"role": old["role"]}),
                                    json.dumps({"role": nc["role"]})
                                ))
                            if nc["phone"] and old.get("phone") != nc["phone"]:
                                audit_logs_to_insert.append((
                                    col["id"],
                                    'PHONE_NUMBER_UPDATED',
                                    json.dumps({"phone": old.get("phone")}),
                                    json.dumps({"phone": nc["phone"]})
                                ))
            except Exception:
                pass
            finally:
                queue.task_done()
                async with lock:
                    processed_count += 1
                    if processed_count % 25 == 0 or processed_count == total_targeted:
                        print(f"Verified [{processed_count}/{total_targeted}] | Discovered Contacts: [{len(all_discovered_contacts)}] | Deltas Audited: [{len(audit_logs_to_insert)}]")

    async with aiohttp.ClientSession(connector=connector, headers=headers) as session:
        worker_tasks = [asyncio.create_task(worker(session)) for _ in range(min(25, total_targeted))]
        await asyncio.gather(*worker_tasks)

    elapsed = time.time() - start_time
    print(f"\n[Audit Completed] Time elapsed: {elapsed:.1f}s ({elapsed/max(1, total_targeted):.2f}s per college)")

    # Step 2: Batch Commit to PostgreSQL
    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            # Update website status & updated_at for colleges
            if status_updates:
                cur.executemany("""
                    UPDATE colleges
                    SET website_status = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                """, status_updates)

            # Insert newly discovered/refreshed contacts
            if all_discovered_contacts:
                upsert_contacts_query = """
                INSERT INTO college_contacts (
                    college_id, college_name, target_email, role, district_location,
                    contact_person, phone, email_syntax_valid, dns_mx_verified,
                    verification_status, confidence_score, updated_at
                ) VALUES (
                    %(college_id)s, %(college_name)s, %(target_email)s, %(role)s, %(district_location)s,
                    %(contact_person)s, %(phone)s, %(email_syntax_valid)s, %(dns_mx_verified)s,
                    %(verification_status)s, %(confidence_score)s, CURRENT_TIMESTAMP
                )
                ON CONFLICT (target_email) DO UPDATE SET
                    college_id = COALESCE(EXCLUDED.college_id, college_contacts.college_id),
                    college_name = EXCLUDED.college_name,
                    role = EXCLUDED.role,
                    district_location = EXCLUDED.district_location,
                    contact_person = COALESCE(EXCLUDED.contact_person, college_contacts.contact_person),
                    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), college_contacts.phone),
                    dns_mx_verified = EXCLUDED.dns_mx_verified,
                    verification_status = EXCLUDED.verification_status,
                    updated_at = CURRENT_TIMESTAMP;
                """
                cur.executemany(upsert_contacts_query, all_discovered_contacts)

            # Insert detected change audit logs
            if audit_logs_to_insert:
                cur.executemany("""
                    INSERT INTO change_audit_logs (college_id, change_type, old_value, new_value)
                    VALUES (%s, %s, %s, %s);
                """, audit_logs_to_insert)

            # Log this crawl job
            cur.execute("""
                INSERT INTO crawl_jobs (
                    job_type, status, colleges_targeted, colleges_crawled, contacts_extracted,
                    started_at, finished_at
                ) VALUES (
                    'MONTHLY_LIVE_DELTA_AUDIT', 'COMPLETED', %s, %s, %s,
                    NOW() - INTERVAL '%s seconds', NOW()
                );
            """, (total_targeted, processed_count, len(all_discovered_contacts), int(elapsed)))

            conn.commit()

            # Step 3: Fetch audit summary counts
            cur.execute("SELECT COUNT(*) AS total_contacts FROM college_contacts;")
            total_db_contacts = cur.fetchone()["total_contacts"]
            cur.execute("SELECT COUNT(*) AS mx_contacts FROM college_contacts WHERE dns_mx_verified = TRUE;")
            total_mx = cur.fetchone()["mx_contacts"]
            cur.execute("SELECT COUNT(*) AS audit_cnt FROM change_audit_logs;")
            total_audits = cur.fetchone()["audit_cnt"]

    print(f"\n{'='*75}")
    print("[POSTGRESQL AUDIT] LIVE MONTHLY MONITORING SUMMARY")
    print(f"{'='*75}")
    print(f"Total Colleges Audited in Batch:  {processed_count:,}")
    print(f"Live Contacts in Database:        {total_db_contacts:,}")
    print(f"DNS MX Deliverable Contacts:      {total_mx:,} ({(total_mx/max(1, total_db_contacts))*100:.1f}%)")
    print(f"Change Audit Events Logged:       {total_audits:,} (Historical change logs)")
    print(f"{'='*75}\n")

def run_daemon_loop(state="Delhi", batch=500):
    """Runs periodic monthly audit every 30 days automatically."""
    print("[DAEMON MODE] Starting Monthly Periodic Automation Daemon...")
    while True:
        try:
            asyncio.run(run_monthly_audit(target_state=state, batch_limit=batch))
        except Exception as e:
            print(f"[Daemon Error] {e}")

        # Sleep for 30 days (30 * 24 * 3600 seconds)
        print("\n[DAEMON MODE] Sleeping until next monthly audit cycle (30 days)...")
        time.sleep(30 * 24 * 3600)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Monthly College Live Audit & Change Monitor")
    parser.add_argument("--state", type=str, default="Delhi", help="State to audit (e.g. 'Delhi', 'Tamil Nadu', or 'All India')")
    parser.add_argument("--limit", type=int, default=500, help="Number of colleges per batch")
    parser.add_argument("--run-now", action="store_true", help="Execute an immediate live audit cycle")
    parser.add_argument("--daemon", action="store_true", help="Run as background periodic monthly daemon")
    args = parser.parse_args()

    if args.daemon:
        run_daemon_loop(state=args.state, batch=args.limit)
    else:
        asyncio.run(run_monthly_audit(target_state=args.state, batch_limit=args.limit))
