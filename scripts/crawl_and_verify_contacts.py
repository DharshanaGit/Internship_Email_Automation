"""
Polite Resource-Throttled College Contact Crawler & MX Verification Pipeline.
Crawls college domains using polite throttles (25 concurrent max, 1.5s delay/host, 7s timeout),
extracts and classifies contacts (Principal, TPO, Dean, Admin),
validates email RFC syntax, performs DNS MX lookups with in-memory caching,
and stores verified contacts into PostgreSQL `college_contacts`.
"""

import sys
import os
import re
import time
import asyncio
import urllib.parse
from pathlib import Path
from collections import defaultdict
import aiohttp
from bs4 import BeautifulSoup
import dns.resolver
from email_validator import validate_email, EmailNotValidError
import psycopg
from psycopg.rows import dict_row

# Line buffering for real-time console streaming
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
# Standard Indian mobile and landline pattern
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

class PoliteAsyncCrawler:
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
        """Enforces per-domain throttle: max 1 request every 1.5 seconds per host."""
        async with self.host_locks[host]:
            now = time.time()
            elapsed = now - self.host_last_request[host]
            if elapsed < self.min_delay:
                await asyncio.sleep(self.min_delay - elapsed)
            self.host_last_request[host] = time.time()

    async def fetch_page(self, session, url):
        """Fetches a single page with timeout and polite host throttling."""
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
        """Queries DNS MX records with in-memory domain caching (synchronous)."""
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
        """Asynchronous non-blocking wrapper around DNS resolver."""
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
        """Strict RFC syntax validation."""
        try:
            v = validate_email(email_str, check_deliverability=False)
            return v.normalized
        except EmailNotValidError:
            return None

    def classify_role(self, email_str, context_text=""):
        """Classifies role into standardized hierarchy."""
        em = email_str.lower()
        ctx = context_text.lower()

        if any(k in em for k in ["tpo", "placement", "placements", "recruit", "career", "training"]):
            return "Training & Placement Officer (TPO)"
        if any(k in em for k in ["principal", "director", "head", "vc", "dean.acad", "rector", "provost"]):
            return "Principal / Director"
        if any(k in em for k in ["hod", "department", "prof", "dean"]):
            return "Dean / HOD"

        # Check proximity in text
        if "placement" in ctx or "tpo" in ctx:
            return "Training & Placement Officer (TPO)"
        if "principal" in ctx or "director" in ctx:
            return "Principal / Director"
        if "hod" in ctx or "department" in ctx:
            return "Dean / HOD"

        return "Administrative / Office"

    def extract_contacts_from_html(self, html_text):
        """Extracts valid candidate emails, phones, and role context from page HTML."""
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
                clean_mailto = href[7:].split("?")[0].strip()
                if clean_mailto:
                    raw_emails.add(clean_mailto)

        valid_emails = set()
        for em in raw_emails:
            clean = em.lower().strip(".,;:()<>[]'\"")
            if any(clean.endswith(ext) for ext in EXCLUDED_EXTENSIONS):
                continue
            parts = clean.split("@")
            if len(parts) != 2:
                continue
            user, domain = parts
            if domain in BLACKLIST_DOMAINS:
                continue
            # Filter dummy strings or placeholders
            if any(x in clean for x in ['example', 'someone', 'yourname', 'domain', 'support@company']):
                continue
            validated = self.validate_syntax(clean)
            if validated:
                valid_emails.add(validated)

        phones = set()
        for p in PHONE_REGEX.findall(page_text):
            p_clean = re.sub(r'[^\d+]', '', p)
            if len(p_clean) >= 10:
                phones.add(p_clean)

        return list(valid_emails), list(phones), page_text

    async def crawl_college(self, session, college):
        """
        Crawls a single college domain across top 5 relevant subpages.
        Returns extracted and verified contacts list.
        """
        base_url = college.get("website_url", "").strip()
        if not base_url:
            return []

        if not base_url.startswith("http"):
            base_url = f"https://{base_url}"

        parsed = urllib.parse.urlparse(base_url)
        base_origin = f"{parsed.scheme}://{parsed.netloc}"

        subpage_urls = [base_origin]
        for sub in TARGET_SUBPAGES:
            subpage_urls.append(urllib.parse.urljoin(base_origin, sub))

        # Strictly limit to top 5 subpages
        subpage_urls = subpage_urls[:5]

        college_emails = set()
        college_phones = set()
        combined_text = ""

        for idx_page, url in enumerate(subpage_urls):
            html, status = await self.fetch_page(session, url)
            if html:
                emails, phones, text = self.extract_contacts_from_html(html)
                college_emails.update(emails)
                college_phones.update(phones)
                combined_text += " " + text[:1000]
            elif idx_page == 0 and status in ("TIMEOUT", "ERROR", "INVALID_URL"):
                # If homepage completely fails, break early to save time
                break

        if not college_emails:
            return []

        # Process and verify found emails
        contacts = []
        primary_phone = list(college_phones)[0] if college_phones else ""

        for email in college_emails:
            has_mx = await self.check_dns_mx_async(email)
            role = self.classify_role(email, combined_text)

            contacts.append({
                "college_id": college["id"],
                "college_name": college["college_name"],
                "target_email": email,
                "role": role,
                "district_location": f"{college.get('district', '')}, {college.get('state', '')}".strip(", "),
                "contact_person": role,
                "phone": primary_phone,
                "email_syntax_valid": True,
                "dns_mx_verified": has_mx,
                "verification_status": "VERIFIED_MX" if has_mx else "SYNTAX_ONLY",
                "confidence_score": 1.00 if has_mx else 0.70
            })

        return contacts

async def run_crawler_pipeline(target_state=None, batch_size=500):
    print(f"\n{'='*75}")
    print(f"[CRAWLER] CONTROLLED CONTACT EXTRACTION & MX VERIFICATION PIPELINE")
    print(f"  Target State: {target_state or 'ALL STATES'}")
    print(f"  Batch Limit:  {batch_size} colleges")
    print(f"  Concurrency:  Max 25 connections (Global Semaphore)")
    print(f"  Throttle:     1 request / 1.5s per host | 7s timeout per page")
    print(f"  Verification: RFC-5322 Syntax + Live DNS MX Record Check")
    print(f"{'='*75}\n")

    # Step 1: Query targeted colleges from PostgreSQL
    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT id, college_name, state, district, website_url
                FROM colleges
                WHERE website_url IS NOT NULL AND website_url != ''
            """
            params = []
            if target_state and target_state.lower() != "all india":
                query += " AND state ILIKE %s"
                params.append(f"%{target_state}%")

            query += " ORDER BY college_name ASC LIMIT %s;"
            params.append(batch_size)

            cur.execute(query, params)
            colleges = cur.fetchall()

    total_colleges = len(colleges)
    print(f"[Target Pool] Retrieved {total_colleges:,} colleges ready for crawl.\n")
    if total_colleges == 0:
        print("[Notice] No colleges found matching criteria.")
        return

    crawler = PoliteAsyncCrawler(max_concurrency=25, min_delay_per_host=1.5, request_timeout=7)
    
    headers = {"User-Agent": USER_AGENT}
    connector = aiohttp.TCPConnector(limit=25, ssl=False)
    
    total_extracted = 0
    total_mx_verified = 0
    all_new_contacts = []
    progress_count = 0
    lock = asyncio.Lock()

    # Create worker queue for 25 concurrent college workers
    queue = asyncio.Queue()
    for col in colleges:
        queue.put_nowait(col)

    start_time = time.time()

    async def worker(session):
        nonlocal total_extracted, total_mx_verified, progress_count
        while not queue.empty():
            try:
                col = queue.get_nowait()
            except asyncio.QueueEmpty:
                break

            try:
                col_contacts = await crawler.crawl_college(session, col)
                if col_contacts:
                    async with lock:
                        all_new_contacts.extend(col_contacts)
                        total_extracted += len(col_contacts)
                        total_mx_verified += sum(1 for c in col_contacts if c["dns_mx_verified"])
            except Exception:
                pass
            finally:
                queue.task_done()
                async with lock:
                    progress_count += 1
                    curr = progress_count
                    if curr % 50 == 0 or curr == total_colleges:
                        print(f"Processed [{curr}/{total_colleges}] | Extracted [{total_extracted}] emails | Deliverable MX: [{total_mx_verified}]")

    async with aiohttp.ClientSession(connector=connector, headers=headers) as session:
        # Launch 25 concurrent polite workers
        worker_tasks = [asyncio.create_task(worker(session)) for _ in range(min(25, total_colleges))]
        await asyncio.gather(*worker_tasks)

    elapsed = time.time() - start_time
    print(f"\n[Crawl Completed] Time elapsed: {elapsed:.1f}s ({elapsed/max(1, total_colleges):.2f}s per college)")

    # Step 2: Batch Insert Contacts into PostgreSQL
    if all_new_contacts:
        print(f"\n[Database Sync] Storing {len(all_new_contacts):,} discovered contacts in PostgreSQL...")
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                upsert_query = """
                INSERT INTO college_contacts (
                    college_id, college_name, target_email, role, district_location,
                    contact_person, phone, email_syntax_valid, dns_mx_verified,
                    verification_status, confidence_score
                ) VALUES (
                    %(college_id)s, %(college_name)s, %(target_email)s, %(role)s, %(district_location)s,
                    %(contact_person)s, %(phone)s, %(email_syntax_valid)s, %(dns_mx_verified)s,
                    %(verification_status)s, %(confidence_score)s
                )
                ON CONFLICT (target_email) DO UPDATE SET
                    college_id = COALESCE(EXCLUDED.college_id, college_contacts.college_id),
                    college_name = EXCLUDED.college_name,
                    role = EXCLUDED.role,
                    district_location = EXCLUDED.district_location,
                    contact_person = COALESCE(EXCLUDED.contact_person, college_contacts.contact_person),
                    phone = COALESCE(EXCLUDED.phone, college_contacts.phone),
                    dns_mx_verified = EXCLUDED.dns_mx_verified,
                    verification_status = EXCLUDED.verification_status,
                    updated_at = CURRENT_TIMESTAMP;
                """
                cur.executemany(upsert_query, all_new_contacts)

                # Record in crawl_jobs
                cur.execute("""
                    INSERT INTO crawl_jobs (
                        job_type, status, colleges_targeted, colleges_crawled, contacts_extracted,
                        started_at, finished_at
                    ) VALUES (
                        'TARGETED_BATCH_CRAWL', 'COMPLETED', %s, %s, %s,
                        NOW() - INTERVAL '%s seconds', NOW()
                    );
                """, (total_colleges, progress_count, len(all_new_contacts), int(elapsed)))

                conn.commit()
        print(f"[Database Sync] Successfully synchronized {len(all_new_contacts):,} contacts into PostgreSQL.")

        # Also sync to SQLite for instant local UI responsiveness
        try:
            import sqlite3
            db_path = Path(__file__).resolve().parent.parent / "data" / "outreach.db"
            if db_path.exists():
                sqlite_conn = sqlite3.connect(db_path)
                s_cur = sqlite_conn.cursor()
                for c in all_new_contacts:
                    s_cur.execute("""
                        INSERT OR REPLACE INTO college_contacts (
                            id, college_id, contact_person, designation, department,
                            email, normalized_email, phone, role_type, is_primary, created_at
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now')
                        );
                    """, (
                        f"ct-{c['target_email']}", str(c['college_id']), c['contact_person'],
                        c['role'], 'Administration', c['target_email'], c['target_email'].lower().strip(),
                        c['phone'], c['role']
                    ))
                sqlite_conn.commit()
                sqlite_conn.close()
                print("[SQLite Sync] Synced verified contacts to local outreach database.")
        except Exception as e:
            print(f"[SQLite Notice] {e}")

    # Step 3: Verification & Counts
    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS total_contacts FROM college_contacts;")
            total_db_contacts = cur.fetchone()["total_contacts"]
            cur.execute("SELECT COUNT(*) AS mx_contacts FROM college_contacts WHERE dns_mx_verified = TRUE;")
            total_mx = cur.fetchone()["mx_contacts"]

    print(f"\n{'='*75}")
    print("[POSTGRESQL AUDIT] LIVE CONTACT DATABASE COUNTS")
    print(f"{'='*75}")
    print(f"Total Contacts in PostgreSQL:      {total_db_contacts:,}")
    print(f"Live DNS MX Deliverable Mailboxes: {total_mx:,} ({(total_mx/max(1, total_db_contacts))*100:.1f}%)")
    print(f"{'='*75}\n")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Polite Resource-Throttled College Contact Crawler")
    parser.add_argument("--state", type=str, default="Tamil Nadu", help="State to process (e.g. 'Tamil Nadu')")
    parser.add_argument("--limit", type=int, default=500, help="Batch limit of colleges to crawl")
    args = parser.parse_args()

    asyncio.run(run_crawler_pipeline(target_state=args.state, batch_size=args.limit))
