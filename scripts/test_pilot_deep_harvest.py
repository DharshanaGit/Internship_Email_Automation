import asyncio
import aiohttp
import ssl
import re
import openpyxl
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
from collections import defaultdict

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
PHONE_REGEX = re.compile(r'(?:\+91[\s-]?)?(?:0?[1-9]\d{1,4}[\s-]?)?\d{6,10}')

JUNK_EMAILS = [
    'example.com', 'domain.com', 'yourname@', 'email.com', 'test@', 'sample@',
    'wixpress.com', 'sentry.io', 'wordpress.org', 'w3.org', 'schema.org',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js',
    'bootstrap', 'cloudflare', 'fontawesome', 'github.com', 'google.com'
]

SUBPAGES_TO_TRY = [
    '', '/contact', '/contact-us', '/contact.php', '/contactus',
    '/faculty', '/staff', '/departments', '/placements', '/about-us'
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
    # Match standard Indian phone patterns
    matches = re.findall(r'(?:(?:\+91|0091|0)[\s-]?)?[6789]\d{9}|(?:\+91[\s-]?)?0?[1-9]\d{1,3}[\s-]?\d{6,8}', text)
    for p in matches:
        clean_p = re.sub(r'[^0-9+]', '', p)
        if len(clean_p) >= 8 and len(clean_p) <= 13:
            if clean_p not in phones:
                phones.append(clean_p)
    return phones[:4]

async def crawl_single_college(session, r, sem):
    async with sem:
        cid = str(int(r[0])) if isinstance(r[0], (int, float)) else str(r[0] or '')
        name = clean_str(r[3])
        web = clean_str(r[4])
        orig_email = normalize_email(r[6])
        src = clean_str(r[7])

        urls = []
        if src and src.startswith('http'): urls.append(src)
        if web and web.startswith('http') and web not in urls: urls.append(web)

        if web and web.startswith('http'):
            b = web.rstrip('/')
            for sub in ['/contact', '/contact-us', '/faculty', '/departments', '/placements']:
                u = b + sub
                if u not in urls: urls.append(u)

        harvested_emails = {}
        harvested_phones = set()

        for u in urls[:4]: # Probe up to 4 endpoints per college
            try:
                async with session.get(u, timeout=aiohttp.ClientTimeout(total=4)) as resp:
                    if resp.status != 200: continue
                    ct = resp.headers.get('Content-Type', '')
                    if 'text' not in ct: continue
                    html = await resp.text(errors='ignore')
                    soup = BeautifulSoup(html, 'html.parser')

                    # 1. Parse Mailto links
                    for a in soup.find_all('a', href=True):
                        href = a.get('href', '').strip()
                        if href.startswith('mailto:'):
                            em = normalize_email(href)
                            if is_valid_email(em) and em not in harvested_emails:
                                parent = a.find_parent(['tr', 'li', 'div', 'p'])
                                ctxt = clean_str(parent.get_text(' ', strip=True) if parent else a.get_text())[:80]
                                harvested_emails[em] = (ctxt, u)

                    # 2. Parse general text for emails
                    for elem in soup.find_all(['tr', 'li', 'p', 'div', 'span', 'td']):
                        txt = elem.get_text(' ', strip=True)
                        if '@' in txt and len(txt) < 300:
                            for raw_em in EMAIL_REGEX.findall(txt):
                                em = normalize_email(raw_em)
                                if is_valid_email(em) and em not in harvested_emails:
                                    ctxt = clean_str(txt)[:80]
                                    harvested_emails[em] = (ctxt, u)

                    # 3. Extract phone numbers from contact elements
                    for elem in soup.find_all(['tr', 'li', 'p', 'div']):
                        txt = elem.get_text(' ', strip=True)
                        if any(k in txt.lower() for k in ['phone', 'tel', 'mobile', 'call', 'contact']):
                            if len(txt) < 200:
                                for p in extract_phones(txt):
                                    harvested_phones.add(p)
            except Exception:
                continue

            if len(harvested_emails) >= 8:
                break

        return {
            'id': cid,
            'name': name,
            'orig_email': orig_email,
            'emails': harvested_emails,
            'phones': list(harvested_phones)
        }

async def run_pilot():
    wb = openpyxl.load_workbook('ANDHRA_PRADESH_VERIFIEDCOLLEGES (1).xlsx', data_only=True)
    rows = list(wb.active.iter_rows(values_only=True))[1:51] # pilot 50

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    connector = aiohttp.TCPConnector(limit=30, ssl=ssl_ctx)
    sem = asyncio.Semaphore(20)

    async with aiohttp.ClientSession(headers=headers, connector=connector) as session:
        tasks = [crawl_single_college(session, r, sem) for r in rows]
        results = await asyncio.gather(*tasks)

        total_emails_found = 0
        total_phones_found = 0
        colleges_with_multi = 0

        print(f"PILOT TEST RESULTS ON 50 COLLEGES:")
        print("=" * 60)
        for res in results:
            ems = res['emails']
            phs = res['phones']
            total_emails_found += len(ems)
            total_phones_found += len(phs)
            if len(ems) > 1:
                colleges_with_multi += 1
                print(f"[{res['id']}] {res['name']}:")
                print(f"   Emails ({len(ems)}): {list(ems.keys())}")
                if phs:
                    print(f"   Phones ({len(phs)}): {phs[:3]}")

        print("=" * 60)
        print(f"Total Colleges Checked: {len(rows)}")
        print(f"Colleges with Multiple Contacts: {colleges_with_multi}")
        print(f"Total Unique Emails Harvested: {total_emails_found}")
        print(f"Total Phone Numbers Harvested: {total_phones_found}")

if __name__ == '__main__':
    asyncio.run(run_pilot())
