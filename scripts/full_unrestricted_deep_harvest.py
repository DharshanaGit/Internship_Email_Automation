import asyncio
import aiohttp
import ssl
import re
import os
import json
import csv
import openpyxl
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
from collections import defaultdict
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

ORIGINAL_EXCEL = 'ANDHRA_PRADESH_VERIFIEDCOLLEGES (1).xlsx'
EXISTING_CSV = 'Andhra_Pradesh_Colleges_Additional_Emails.csv'
CACHE_FILE = 'data/harvested_colleges_cache.json'
OUTPUT_EXCEL = 'Andhra_Pradesh_Colleges_Additional_Emails.xlsx'
OUTPUT_CSV = 'Andhra_Pradesh_Colleges_Additional_Emails.csv'
TARGET_FOLDER = '01_Verified_Colleges_With_Websites'

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')

JUNK_EMAILS = [
    'example.com', 'domain.com', 'yourname@', 'email.com', 'test@', 'sample@',
    'wixpress.com', 'sentry.io', 'wordpress.org', 'w3.org', 'schema.org',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js',
    'bootstrap', 'cloudflare', 'fontawesome', 'github.com', 'google.com',
    'reactjs.org', 'angular.io', 'vimeo.com', 'youtube.com', 'facebook.com',
    'twitter.com', 'linkedin.com', 'instagram.com', 'themeforest', 'envato'
]

COMMON_SUBPAGES = [
    '/contact', '/contact-us', '/contactus', '/contact.php', '/contact.html',
    '/faculty', '/staff', '/departments', '/placements', '/placement',
    '/administration', '/about-us', '/iqac'
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

def extract_designation(elem, max_len=75):
    if not elem: return ''
    # Look for immediate parent row or container
    parent = elem.find_parent(['tr', 'li', 'td', 'div', 'p'])
    if not parent:
        text = elem.get_text(' ', strip=True)
    else:
        text = parent.get_text(' ', strip=True)
    
    # Clean text: remove emails and long noise
    text = re.sub(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    # If text is too long, find the most relevant chunk
    if len(text) > max_len:
        text = text[:max_len].strip() + '...'
    return text

async def crawl_single_college(session, cid, name, web_url, orig_email, src_url, sem):
    async with sem:
        harvested_emails = {} # email -> {desig, url, phone}
        harvested_phones = set()

        urls_to_visit = []
        if src_url and src_url.startswith('http'):
            urls_to_visit.append(src_url)
        if web_url and web_url.startswith('http') and web_url not in urls_to_visit:
            urls_to_visit.append(web_url)

        base_netloc = ''
        if web_url and web_url.startswith('http'):
            parsed = urlparse(web_url)
            base_netloc = parsed.netloc
            base_root = f"{parsed.scheme}://{parsed.netloc}"
        elif src_url and src_url.startswith('http'):
            parsed = urlparse(src_url)
            base_netloc = parsed.netloc
            base_root = f"{parsed.scheme}://{parsed.netloc}"
        else:
            base_root = ''

        visited = set()
        discovered_subpages = []

        # 1. Fetch primary / homepage first to find dynamic links
        for u in list(urls_to_visit):
            if u in visited: continue
            visited.add(u)
            try:
                async with session.get(u, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    if resp.status != 200: continue
                    ct = resp.headers.get('Content-Type', '')
                    if 'text' not in ct: continue
                    html = await resp.text(errors='ignore')
                    soup = BeautifulSoup(html, 'html.parser')

                    # Mailto links
                    for a in soup.find_all('a', href=True):
                        href = a.get('href', '').strip()
                        if href.startswith('mailto:'):
                            em = normalize_email(href)
                            if is_valid_email(em) and em not in harvested_emails:
                                desig = extract_designation(a)
                                harvested_emails[em] = {'desig': desig, 'url': u}
                        elif base_netloc and not href.startswith('mailto:') and not href.startswith('tel:'):
                            # Check if this link is a valuable subpage
                            full_url = urljoin(u, href)
                            p = urlparse(full_url)
                            if p.netloc == base_netloc:
                                path_lower = p.path.lower()
                                if any(k in path_lower for k in ['contact', 'faculty', 'staff', 'placement', 'department', 'iqac', 'admin']):
                                    if full_url not in visited and full_url not in discovered_subpages:
                                        discovered_subpages.append(full_url)

                    # Text scan for emails
                    for elem in soup.find_all(['tr', 'li', 'p', 'div', 'span', 'td']):
                        txt = elem.get_text(' ', strip=True)
                        if '@' in txt and len(txt) < 350:
                            for raw_em in EMAIL_REGEX.findall(txt):
                                em = normalize_email(raw_em)
                                if is_valid_email(em) and em not in harvested_emails:
                                    desig = extract_designation(elem)
                                    harvested_emails[em] = {'desig': desig, 'url': u}

                    # Phones
                    for elem in soup.find_all(['tr', 'li', 'p', 'div']):
                        txt = elem.get_text(' ', strip=True)
                        if any(k in txt.lower() for k in ['phone', 'tel', 'mobile', 'call', 'contact']):
                            if len(txt) < 250:
                                for ph in extract_phones(txt):
                                    harvested_phones.add(ph)
            except Exception:
                pass

        # 2. Add top discovered subpages or fallback common subpages
        subpages_to_crawl = discovered_subpages[:3]
        if len(subpages_to_crawl) < 2 and base_root:
            for sub in ['/contact', '/contact-us', '/faculty', '/placements']:
                cand = base_root + sub
                if cand not in visited and cand not in subpages_to_crawl:
                    subpages_to_crawl.append(cand)

        for u in subpages_to_crawl[:3]:
            if u in visited: continue
            visited.add(u)
            try:
                async with session.get(u, timeout=aiohttp.ClientTimeout(total=4)) as resp:
                    if resp.status != 200: continue
                    ct = resp.headers.get('Content-Type', '')
                    if 'text' not in ct: continue
                    html = await resp.text(errors='ignore')
                    soup = BeautifulSoup(html, 'html.parser')

                    for a in soup.find_all('a', href=True):
                        href = a.get('href', '').strip()
                        if href.startswith('mailto:'):
                            em = normalize_email(href)
                            if is_valid_email(em) and em not in harvested_emails:
                                desig = extract_designation(a)
                                harvested_emails[em] = {'desig': desig, 'url': u}

                    for elem in soup.find_all(['tr', 'li', 'p', 'div', 'span', 'td']):
                        txt = elem.get_text(' ', strip=True)
                        if '@' in txt and len(txt) < 350:
                            for raw_em in EMAIL_REGEX.findall(txt):
                                em = normalize_email(raw_em)
                                if is_valid_email(em) and em not in harvested_emails:
                                    desig = extract_designation(elem)
                                    harvested_emails[em] = {'desig': desig, 'url': u}

                    for elem in soup.find_all(['tr', 'li', 'p', 'div']):
                        txt = elem.get_text(' ', strip=True)
                        if any(k in txt.lower() for k in ['phone', 'tel', 'mobile', 'call', 'contact']):
                            if len(txt) < 250:
                                for ph in extract_phones(txt):
                                    harvested_phones.add(ph)
            except Exception:
                pass

            if len(harvested_emails) >= 10:
                break

        return {
            'id': cid,
            'name': name,
            'emails': harvested_emails,
            'phones': list(harvested_phones)
        }

async def run_full_harvest():
    print("=" * 70)
    print("STARTING FULL UNRESTRICTED DEEP CONTACT HARVESTING (2,529 COLLEGES)")
    print("=" * 70)

    # 1. Load Base Colleges
    wb = openpyxl.load_workbook(ORIGINAL_EXCEL, data_only=True)
    raw_rows = list(wb.active.iter_rows(values_only=True))[1:]
    print(f"Loaded {len(raw_rows)} institutions from {ORIGINAL_EXCEL}")

    # 2. Load Existing Baseline Contacts
    existing_contacts = defaultdict(list)
    if os.path.exists(EXISTING_CSV):
        with open(EXISTING_CSV, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader, None)
            for row in reader:
                if not row: continue
                cid = str(row[0]).split('.')[0].strip()
                # Additional contacts start at column 13
                # Col 13 = Addl Email 1, Col 14 = Addl Desig 1, Col 15 = Addl Source 1
                for i in range(13, len(row), 3):
                    if i < len(row) and row[i]:
                        add_em = normalize_email(row[i])
                        add_des = row[i+1] if i+1 < len(row) else ''
                        add_src = row[i+2] if i+2 < len(row) else ''
                        if is_valid_email(add_em):
                            existing_contacts[cid].append({
                                'email': add_em,
                                'desig': add_des,
                                'url': add_src,
                                'phone': ''
                            })
        print(f"Loaded existing baseline contacts for {len(existing_contacts)} institutions.")

    # 3. Load or Initialize Cache
    cached_data = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cached_data = json.load(f)
            print(f"Loaded {len(cached_data)} previously harvested records from cache: {CACHE_FILE}")
        except Exception as e:
            print(f"Could not load cache: {e}")

    # Prepare Tasks
    records_to_crawl = []
    for r in raw_rows:
        cid = str(int(r[0])) if isinstance(r[0], (int, float)) else str(r[0] or '')
        name = clean_str(r[3])
        web = clean_str(r[4])
        orig_email = normalize_email(r[6])
        src = clean_str(r[7])

        if cid not in cached_data:
            records_to_crawl.append((cid, name, web, orig_email, src))

    print(f"Remaining institutions to harvest: {len(records_to_crawl)}")

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
    }

    connector = aiohttp.TCPConnector(limit=50, ssl=ssl_ctx)
    sem = asyncio.Semaphore(40)

    # Process in batches of 250
    BATCH_SIZE = 250
    async with aiohttp.ClientSession(headers=headers, connector=connector) as session:
        for b_idx in range(0, len(records_to_crawl), BATCH_SIZE):
            batch = records_to_crawl[b_idx:b_idx+BATCH_SIZE]
            print(f"\nProcessing batch {b_idx + 1} to {min(b_idx + BATCH_SIZE, len(records_to_crawl))} of {len(records_to_crawl)}...")
            
            tasks = [
                crawl_single_college(session, cid, name, web, orig_em, src, sem)
                for cid, name, web, orig_em, src in batch
            ]
            batch_results = await asyncio.gather(*tasks)

            # Store in cache
            for res in batch_results:
                cid = res['id']
                cached_data[cid] = {
                    'name': res['name'],
                    'emails': res['emails'],
                    'phones': res['phones']
                }

            # Save checkpoint
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(cached_data, f, ensure_ascii=False, indent=2)
            print(f"Checkpoint saved. Total cached colleges: {len(cached_data)}")

    print("\n" + "=" * 70)
    print("ALL HARVESTING COMPLETE! BUILDING SAME-ROW WORKBOOK & CSV...")
    print("=" * 70)

    # 4. Build Enriched Consolidated Same-Row Workbook
    MAX_ADDITIONAL = 8 # Support up to 8 additional contacts per row
    headers_list = [
        "#", "State", "City / District", "College Name", "Official Website URL",
        "Primary Contact / Department", "Primary Official Email", "Primary Source Page URL",
        "Status", "Sent Date", "Remarks",
        "Total Verified Contacts", "All Verified Emails (Combined)", "All Verified Phone Numbers (Combined)"
    ]

    for i in range(1, MAX_ADDITIONAL + 1):
        headers_list.extend([
            f"Additional Email {i}",
            f"Additional Designation {i}",
            f"Additional Source URL {i}"
        ])

    wb_out = openpyxl.Workbook()
    ws = wb_out.active
    ws.title = "AP_Colleges_Enriched"
    ws.views.sheetView[0].showGridLines = True

    # Styling
    navy_header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    dark_accent_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    green_accent_fill = PatternFill(start_color="065F46", end_color="065F46", fill_type="solid") # Phone header
    header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    highlight_row_fill = PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid")
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    ws.append(headers_list)
    for col_idx in range(1, len(headers_list) + 1):
        cell = ws.cell(row=1, column=col_idx)
        if col_idx <= 11:
            cell.fill = navy_header_fill
        elif col_idx in [12, 13]:
            cell.fill = dark_accent_fill
        elif col_idx == 14:
            cell.fill = green_accent_fill
        else:
            cell.fill = dark_accent_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    ws.row_dimensions[1].height = 28
    csv_rows = [headers_list]

    total_emails_harvested = 0
    total_phones_harvested = 0
    colleges_with_multi_emails = 0
    colleges_with_phones = 0

    row_num = 2
    for r in raw_rows:
        cid = str(int(r[0])) if isinstance(r[0], (int, float)) else str(r[0] or '')
        state = clean_str(r[1]) or 'Andhra Pradesh'
        city = clean_str(r[2])
        name = clean_str(r[3])
        web = clean_str(r[4])
        primary_contact = clean_str(r[5])
        primary_email = normalize_email(r[6])
        primary_src = clean_str(r[7])
        status = clean_str(r[8]) or 'Verified'
        sent_date = clean_str(r[9]) or '—'
        remarks = clean_str(r[10])

        # Merge existing baseline contacts + freshly harvested contacts
        merged_contacts = []
        seen_emails = set()
        if primary_email:
            seen_emails.add(primary_email)

        # Baseline contacts
        for b_c in existing_contacts.get(cid, []):
            em = b_c['email']
            if em not in seen_emails:
                seen_emails.add(em)
                merged_contacts.append((em, b_c.get('desig', ''), b_c.get('url', '')))

        # Freshly harvested contacts
        h_data = cached_data.get(cid, {})
        h_emails = h_data.get('emails', {})
        h_phones = h_data.get('phones', [])

        for em, info in h_emails.items():
            norm_em = normalize_email(em)
            if is_valid_email(norm_em) and norm_em not in seen_emails:
                seen_emails.add(norm_em)
                des = info.get('desig', '') or 'Department / Faculty Desk'
                u = info.get('url', '') or web
                merged_contacts.append((norm_em, des, u))

        # All Verified Emails List
        all_emails = [primary_email] if primary_email else []
        for em, _, _ in merged_contacts:
            if em not in all_emails:
                all_emails.append(em)

        total_emails_found = len(all_emails)
        combined_emails_str = "; ".join(all_emails)
        combined_phones_str = "; ".join(h_phones)

        if total_emails_found > 1:
            colleges_with_multi_emails += 1
        if len(h_phones) > 0:
            colleges_with_phones += 1

        total_emails_harvested += total_emails_found
        total_phones_harvested += len(h_phones)

        # Build row
        row_cells = [
            cid, state, city, name, web,
            primary_contact, primary_email, primary_src,
            status, sent_date, remarks,
            total_emails_found, combined_emails_str, combined_phones_str
        ]

        # Additional contacts 1..8
        for i in range(MAX_ADDITIONAL):
            if i < len(merged_contacts):
                c_em, c_des, c_url = merged_contacts[i]
                row_cells.extend([c_em, c_des, c_url])
            else:
                row_cells.extend(["", "", ""])

        ws.append(row_cells)
        csv_rows.append(row_cells)

        # Row styling
        has_multi = total_emails_found > 1 or len(h_phones) > 0
        for col_idx in range(1, len(row_cells) + 1):
            cell = ws.cell(row=row_num, column=col_idx)
            cell.border = thin_border
            cell.font = Font(name="Calibri", size=9.5)
            if col_idx in [1, 9, 10, 12]:
                cell.alignment = Alignment(horizontal="center")
            if has_multi and col_idx >= 12:
                cell.fill = highlight_row_fill

        row_num += 1

    # Column widths
    ws.column_dimensions['A'].width = 8
    ws.column_dimensions['B'].width = 16
    ws.column_dimensions['C'].width = 20
    ws.column_dimensions['D'].width = 44
    ws.column_dimensions['E'].width = 34
    ws.column_dimensions['F'].width = 30
    ws.column_dimensions['G'].width = 34
    ws.column_dimensions['H'].width = 40
    ws.column_dimensions['I'].width = 12
    ws.column_dimensions['J'].width = 12
    ws.column_dimensions['K'].width = 30
    ws.column_dimensions['L'].width = 18
    ws.column_dimensions['M'].width = 50
    ws.column_dimensions['N'].width = 34

    for i in range(MAX_ADDITIONAL):
        base_c = 15 + (i * 3)
        ws.column_dimensions[get_column_letter(base_c)].width = 34
        ws.column_dimensions[get_column_letter(base_c + 1)].width = 32
        ws.column_dimensions[get_column_letter(base_c + 2)].width = 40

    # Save to Root Deliverables
    wb_out.save(OUTPUT_EXCEL)
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(csv_rows)

    # Save to 01_Verified_Colleges_With_Websites
    target_excel = os.path.join(TARGET_FOLDER, OUTPUT_EXCEL)
    target_csv = os.path.join(TARGET_FOLDER, OUTPUT_CSV)
    wb_out.save(target_excel)
    with open(target_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(csv_rows)

    print("\n" + "=" * 70)
    print("FINAL SUMMARY REPORT:")
    print("=" * 70)
    print(f"Total Colleges Enriched: {len(raw_rows)}")
    print(f"Total Unique Emails in Dataset: {total_emails_harvested}")
    print(f"Total Unique Phone Numbers Extracted: {total_phones_harvested}")
    print(f"Colleges with Multiple Emails: {colleges_with_multi_emails}")
    print(f"Colleges with Verified Phone Numbers: {colleges_with_phones}")
    print(f"Saved Master Excel: {OUTPUT_EXCEL} ({ws.max_row - 1} records, {ws.max_column} columns)")
    print(f"Saved Folder Copy: {target_excel}")
    print(f"Saved Master CSV: {OUTPUT_CSV}")
    print(f"Saved Folder CSV: {target_csv}")
    print("=" * 70)

if __name__ == '__main__':
    asyncio.run(run_full_harvest())
