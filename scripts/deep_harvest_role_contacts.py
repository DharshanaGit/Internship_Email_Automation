import asyncio
import aiohttp
import ssl
import re
import os
import json
import openpyxl
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin

CACHE_FILE = 'data/harvested_colleges_cache.json'
ORIGINAL_EXCEL = 'ANDHRA_PRADESH_VERIFIEDCOLLEGES (1).xlsx'

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
PHONE_REGEX = re.compile(r'(?:(?:\+91|0091|0)[\s-]?)?[6789]\d{9}|(?:\+91[\s-]?)?0?[1-9]\d{1,3}[\s-]?\d{6,8}')

JUNK_EMAILS = [
    'example.com', 'domain.com', 'yourname@', 'email.com', 'test@', 'sample@',
    'wixpress.com', 'sentry.io', 'wordpress.org', 'w3.org', 'schema.org',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js',
    'bootstrap', 'cloudflare', 'fontawesome', 'github.com', 'google.com'
]

TPO_PATHS = [
    '/placements', '/placement', '/training-and-placement', '/tpo',
    '/placement-cell', '/placements.php', '/placement.html', '/placements.html',
    '/career', '/corporate-relations', '/training_placement'
]

STUDENT_AFFAIRS_PATHS = [
    '/student-affairs', '/student-welfare', '/dsw', '/students-corner',
    '/dean-students', '/campus-life', '/student-council'
]

def clean_str(val):
    return str(val).strip() if val is not None else ''

def normalize_email(em):
    if not em: return ''
    em = str(em).strip().lower().rstrip('.')
    if em.startswith('mailto:'):
        em = em.replace('mailto:', '').split('?')[0].strip()
    return em

def is_valid_email(em):
    if not em or '@' not in em: return False
    em = em.lower().strip()
    if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', em): return False
    if any(j in em for j in JUNK_EMAILS): return False
    parts = em.split('@')
    if len(parts) != 2: return False
    dom = parts[1]
    if '.' not in dom or len(dom.split('.')[-1]) < 2: return False
    return True

def extract_phones(text):
    phones = []
    matches = re.findall(r'(?:(?:\+91|0091|0)[\s-]?)?[6789]\d{9}|(?:\+91[\s-]?)?0?[1-9]\d{1,3}[\s-]?\d{6,8}', text)
    for p in matches:
        clean_p = re.sub(r'[^0-9+]', '', p)
        if 8 <= len(clean_p) <= 13:
            if clean_p not in phones:
                phones.append(clean_p)
    return phones[:4]

def extract_context(elem, max_len=80):
    if not elem: return ''
    parent = elem.find_parent(['tr', 'li', 'td', 'div', 'p'])
    text = parent.get_text(' ', strip=True) if parent else elem.get_text(' ', strip=True)
    text = re.sub(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:max_len]

async def probe_college_role_pages(session, cid, name, web_url, sem, cache_entry):
    async with sem:
        if not web_url or not web_url.startswith('http'):
            return cid, {}, []

        parsed = urlparse(web_url)
        base_root = f"{parsed.scheme}://{parsed.netloc}"
        
        # Check candidate endpoints
        endpoints_to_test = []
        for p in TPO_PATHS[:5] + STUDENT_AFFAIRS_PATHS[:3]:
            u = base_root + p
            endpoints_to_test.append(u)

        found_emails = {}
        found_phones = set()

        for u in endpoints_to_test[:5]:
            try:
                async with session.get(u, timeout=aiohttp.ClientTimeout(total=3.5)) as resp:
                    if resp.status != 200: continue
                    ct = resp.headers.get('Content-Type', '')
                    if 'text' not in ct: continue
                    html = await resp.text(errors='ignore')
                    soup = BeautifulSoup(html, 'html.parser')

                    # 1. Mailto links
                    for a in soup.find_all('a', href=True):
                        href = a.get('href', '').strip()
                        if href.startswith('mailto:'):
                            em = normalize_email(href)
                            if is_valid_email(em):
                                ctx = extract_context(a)
                                found_emails[em] = {'desig': ctx or 'TPO / Student Desk', 'url': u}

                    # 2. Text emails
                    for elem in soup.find_all(['tr', 'li', 'p', 'div', 'td']):
                        txt = elem.get_text(' ', strip=True)
                        if '@' in txt and len(txt) < 350:
                            for raw_em in EMAIL_REGEX.findall(txt):
                                em = normalize_email(raw_em)
                                if is_valid_email(em):
                                    ctx = extract_context(elem)
                                    found_emails[em] = {'desig': ctx or 'Department / Placement Desk', 'url': u}

                    # 3. Phones
                    for elem in soup.find_all(['tr', 'li', 'p', 'div']):
                        txt = elem.get_text(' ', strip=True)
                        if any(k in txt.lower() for k in ['phone', 'tel', 'mobile', 'call', 'contact']):
                            if len(txt) < 200:
                                for ph in extract_phones(txt):
                                    found_phones.add(ph)
            except Exception:
                continue

            if len(found_emails) >= 6:
                break

        return cid, found_emails, list(found_phones)

async def run_targeted_role_harvest():
    print("=" * 70)
    print("STARTING TARGETED TPO, STUDENT AFFAIRS & HOD DEEP HARVEST")
    print("=" * 70)

    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        cache = json.load(f)

    wb = openpyxl.load_workbook(ORIGINAL_EXCEL, data_only=True)
    raw_rows = list(wb.active.iter_rows(values_only=True))[1:]
    print(f"Loaded {len(raw_rows)} colleges. Cache has {len(cache)} colleges.")

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }

    connector = aiohttp.TCPConnector(limit=50, ssl=ssl_ctx)
    sem = asyncio.Semaphore(40)

    # Filter colleges that could benefit from targeted crawl (especially Engineering, Universities, Management)
    colleges_to_probe = []
    for r in raw_rows:
        cid = str(int(r[0])) if isinstance(r[0], (int, float)) else str(r[0] or '')
        name = clean_str(r[3])
        web = clean_str(r[4])
        if web and web.startswith('http'):
            colleges_to_probe.append((cid, name, web))

    print(f"Colleges to probe for TPO / Student Welfare / HOD endpoints: {len(colleges_to_probe)}")

    BATCH_SIZE = 250
    total_new_emails = 0
    total_new_phones = 0

    async with aiohttp.ClientSession(headers=headers, connector=connector) as session:
        for b_idx in range(0, len(colleges_to_probe), BATCH_SIZE):
            batch = colleges_to_probe[b_idx:b_idx+BATCH_SIZE]
            print(f"Probing batch {b_idx + 1} to {min(b_idx + BATCH_SIZE, len(colleges_to_probe))} of {len(colleges_to_probe)}...")
            
            tasks = [
                probe_college_role_pages(session, cid, name, web, sem, cache.get(cid, {}))
                for cid, name, web in batch
            ]
            batch_results = await asyncio.gather(*tasks)

            for cid, emails, phones in batch_results:
                if cid in cache:
                    existing_emails = cache[cid].get('emails', {})
                    for em, info in emails.items():
                        if em not in existing_emails:
                            existing_emails[em] = info
                            total_new_emails += 1
                    cache[cid]['emails'] = existing_emails

                    existing_phones = set(cache[cid].get('phones', []))
                    for ph in phones:
                        if ph not in existing_phones:
                            existing_phones.add(ph)
                            total_new_phones += 1
                    cache[cid]['phones'] = list(existing_phones)

            # Checkpoint save
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(cache, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 70)
    print(f"TARGETED HARVEST COMPLETE!")
    print(f"Added {total_new_emails} new role emails and {total_new_phones} new phones to cache!")
    print("=" * 70)

if __name__ == '__main__':
    asyncio.run(run_targeted_role_harvest())
