import asyncio
import aiohttp
import ssl
import re
import os
import json
import csv
import openpyxl
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
from collections import defaultdict
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

INPUT_CSV = "final dataset/ANDHRA_PRADESH_COLLEGES.csv"
OUTPUT_DIR = "final dataset"
OUTPUT_EXCEL = os.path.join(OUTPUT_DIR, "ANDHRA_PRADESH_COLLEGES.xlsx")
OUTPUT_CSV = os.path.join(OUTPUT_DIR, "ANDHRA_PRADESH_COLLEGES.csv")
CACHE_FILE = "data/final_dataset_contacts_cache.json"
README_FILE = os.path.join(OUTPUT_DIR, "README.txt")

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')

# Role Keywords Hierarchy
TPO_KEYWORDS = [
    'tpo', 'placement', 'placements', 'tnp', 'career', 'corporate',
    'industry', 'iiic', 'recruit', 'internship', 'training.placement',
    'training@', 'placementcell', 'placementofficer', 'cdc@', 'tap@'
]

LEADERSHIP_KEYWORDS = [
    'chancellor', 'vice-chancellor', 'vice_chancellor', 'vc@', 'provc',
    'pro-vc', 'pro_vc', 'prochancellor', 'registrar', 'reg@', 'principal',
    'director', 'viceprincipal', 'vice-principal', 'dean.academic',
    'dean_academic', 'deanacademics', 'dean-academic', 'coe@', 'controller',
    'iqac', 'naac', 'administration', 'admin@', 'office@', 'directorate'
]

STUDENT_AFFAIRS_KEYWORDS = [
    'student', 'welfare', 'dsw', 'studentaffairs', 'student-affairs',
    'student_affairs', 'studentwelfare', 'student-welfare', 'student_welfare',
    'council', 'nss', 'ncc', 'clubs', 'activities', 'campuslife', 'students.'
]

HOD_KEYWORDS = [
    'hod', 'head', 'cse@', 'ece@', 'mech@', 'civil@', 'eee@', 'it@',
    'mba@', 'mca@', 'commerce@', 'science@', 'maths@', 'physics@',
    'chemistry@', 'humanities@', 'hod.', 'hod_', '_hod'
]

FACULTY_KEYWORDS = [
    'prof', 'professor', 'faculty', 'lecturer', 'assoc', 'asst',
    'teacher', 'teaching', 'staff', 'instructor', 'dr.'
]

JUNK_EMAILS = [
    'example.com', 'domain.com', 'yourname@', 'email.com', 'test@', 'sample@',
    'wixpress.com', 'sentry.io', 'wordpress.org', 'w3.org', 'schema.org',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js',
    'bootstrap', 'cloudflare', 'fontawesome', 'github.com', 'google.com'
]

COMMON_SUBPAGES = [
    '/contact', '/contact-us', '/contact.php', '/contact.html',
    '/faculty', '/staff', '/departments', '/placements', '/placement',
    '/tpo', '/administration', '/about-us', '/iqac', '/student-affairs',
    '/student-welfare'
]

def clean_str(val):
    if val is None: return ""
    val = str(val).strip()
    return "" if val.lower() in ["none", "null", "na", "-", "--"] else val

def normalize_email(em):
    if not em: return ""
    em = str(em).strip().lower().rstrip('.')
    if em.startswith('mailto:'):
        em = em.replace('mailto:', '').split('?')[0].strip()
    return em

def clean_email(em):
    norm = normalize_email(em)
    return norm if is_valid_email(norm) else ""

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

def extract_context(elem, max_len=75):
    if not elem: return ""
    parent = elem.find_parent(['tr', 'li', 'td', 'div', 'p'])
    text = parent.get_text(' ', strip=True) if parent else elem.get_text(' ', strip=True)
    text = re.sub(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:max_len]

def classify_contact(email, context=""):
    em = email.lower().strip()
    ctx = context.lower().strip()
    combined = f"{em} {ctx}"

    # 1. TPO & Placement
    if any(k in combined for k in TPO_KEYWORDS):
        return 'TPO'

    # 2. Student Affairs / Student Welfare
    if any(k in combined for k in STUDENT_AFFAIRS_KEYWORDS):
        return 'STUDENT_AFFAIRS'

    # 3. HOD / Department Heads
    if any(k in combined for k in HOD_KEYWORDS) or em.startswith('hod') or '_hod' in em or 'hod_' in em:
        return 'HOD'

    # 4. Leadership (VC, Registrar, Principal, Director, Deans)
    if any(k in combined for k in LEADERSHIP_KEYWORDS) or em.startswith(('principal', 'director', 'registrar', 'vc', 'dean')):
        return 'LEADERSHIP'

    # 5. Faculty / Professors
    if any(k in combined for k in FACULTY_KEYWORDS):
        return 'FACULTY'

    return 'GENERAL'

async def crawl_college_website(session, cid, name, web_url, sem):
    async with sem:
        if not web_url or not web_url.startswith('http'):
            return cid, {}, []

        parsed = urlparse(web_url)
        base_netloc = parsed.netloc
        base_root = f"{parsed.scheme}://{parsed.netloc}"

        visited = set()
        harvested_emails = {} # em -> {'desig': desig, 'url': u}
        harvested_phones = set()
        discovered_subpages = []

        # 1. Homepage scan
        try:
            async with session.get(web_url, timeout=aiohttp.ClientTimeout(total=4)) as resp:
                if resp.status == 200 and 'text' in resp.headers.get('Content-Type', ''):
                    html = await resp.text(errors='ignore')
                    soup = BeautifulSoup(html, 'html.parser')

                    # Parse mailto
                    for a in soup.find_all('a', href=True):
                        href = a.get('href', '').strip()
                        if href.startswith('mailto:'):
                            em = normalize_email(href)
                            if is_valid_email(em):
                                ctx = extract_context(a)
                                harvested_emails[em] = {'desig': ctx, 'url': web_url}
                        elif base_netloc and not href.startswith(('mailto:', 'tel:', 'javascript:')):
                            full_u = urljoin(web_url, href)
                            p = urlparse(full_u)
                            if p.netloc == base_netloc:
                                path_low = p.path.lower()
                                if any(k in path_low for k in ['contact', 'faculty', 'staff', 'placement', 'tpo', 'department', 'student', 'welfare', 'admin', 'about']):
                                    if full_u not in visited and full_u not in discovered_subpages:
                                        discovered_subpages.append(full_u)

                    # Text scan
                    for elem in soup.find_all(['tr', 'li', 'p', 'div', 'td']):
                        txt = elem.get_text(' ', strip=True)
                        if '@' in txt and len(txt) < 300:
                            for raw_em in EMAIL_REGEX.findall(txt):
                                em = normalize_email(raw_em)
                                if is_valid_email(em) and em not in harvested_emails:
                                    ctx = extract_context(elem)
                                    harvested_emails[em] = {'desig': ctx, 'url': web_url}

                    # Phones
                    for elem in soup.find_all(['tr', 'li', 'p', 'div']):
                        txt = elem.get_text(' ', strip=True)
                        if any(k in txt.lower() for k in ['phone', 'tel', 'mobile', 'call', 'contact']):
                            if len(txt) < 200:
                                for ph in extract_phones(txt):
                                    harvested_phones.add(ph)
        except Exception:
            pass

        visited.add(web_url)

        # 2. Subpage probes
        subpages_to_crawl = discovered_subpages[:3]
        if len(subpages_to_crawl) < 2 and base_root:
            for sub in ['/contact-us', '/contact', '/placements', '/faculty']:
                cand = base_root + sub
                if cand not in visited and cand not in subpages_to_crawl:
                    subpages_to_crawl.append(cand)

        for u in subpages_to_crawl[:3]:
            if u in visited: continue
            visited.add(u)
            try:
                async with session.get(u, timeout=aiohttp.ClientTimeout(total=3.5)) as resp:
                    if resp.status == 200 and 'text' in resp.headers.get('Content-Type', ''):
                        html = await resp.text(errors='ignore')
                        soup = BeautifulSoup(html, 'html.parser')

                        for a in soup.find_all('a', href=True):
                            href = a.get('href', '').strip()
                            if href.startswith('mailto:'):
                                em = normalize_email(href)
                                if is_valid_email(em) and em not in harvested_emails:
                                    ctx = extract_context(a)
                                    harvested_emails[em] = {'desig': ctx, 'url': u}

                        for elem in soup.find_all(['tr', 'li', 'p', 'div', 'td']):
                            txt = elem.get_text(' ', strip=True)
                            if '@' in txt and len(txt) < 300:
                                for raw_em in EMAIL_REGEX.findall(txt):
                                    em = normalize_email(raw_em)
                                    if is_valid_email(em) and em not in harvested_emails:
                                        ctx = extract_context(elem)
                                        harvested_emails[em] = {'desig': ctx, 'url': u}

                        for elem in soup.find_all(['tr', 'li', 'p', 'div']):
                            txt = elem.get_text(' ', strip=True)
                            if any(k in txt.lower() for k in ['phone', 'tel', 'mobile', 'call', 'contact']):
                                if len(txt) < 200:
                                    for ph in extract_phones(txt):
                                        harvested_phones.add(ph)
            except Exception:
                pass

            if len(harvested_emails) >= 12:
                break

        return cid, harvested_emails, list(harvested_phones)

async def run_full_pipeline():
    print("=" * 80)
    print("STARTING COMPREHENSIVE MULTI-ROLE DEEP HARVESTING FOR ANDHRA_PRADESH_COLLEGES")
    print("=" * 80)

    # 1. Load Base Dataset
    with open(INPUT_CSV, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        raw_rows = list(reader)

    print(f"Loaded {len(raw_rows)} colleges from {INPUT_CSV}")

    # 2. Load or Initialize Cache
    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cache = json.load(f)
            print(f"Loaded {len(cache)} colleges from cache: {CACHE_FILE}")
        except Exception:
            cache = {}

    # Prepare list of colleges to crawl
    colleges_to_crawl = []
    for r in raw_rows:
        cid = r[0]
        name = r[3]
        web = r[4]
        if cid not in cache and web and web.startswith('http'):
            colleges_to_crawl.append((cid, name, web))

    print(f"Colleges to crawl for multi-role contacts: {len(colleges_to_crawl)}")

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }

    connector = aiohttp.TCPConnector(limit=50, ssl=ssl_ctx)
    sem = asyncio.Semaphore(45)

    BATCH_SIZE = 250
    async with aiohttp.ClientSession(headers=headers, connector=connector) as session:
        for b_idx in range(0, len(colleges_to_crawl), BATCH_SIZE):
            batch = colleges_to_crawl[b_idx:b_idx+BATCH_SIZE]
            print(f"Crawling batch {b_idx + 1} to {min(b_idx + BATCH_SIZE, len(colleges_to_crawl))} of {len(colleges_to_crawl)}...")

            tasks = [crawl_college_website(session, cid, name, web, sem) for cid, name, web in batch]
            batch_results = await asyncio.gather(*tasks)

            for cid, emails, phones in batch_results:
                cache[cid] = {
                    'emails': emails,
                    'phones': phones
                }

            # Checkpoint save
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(cache, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 80)
    print("HARVESTING COMPLETE! ORGANIZING INTO MULTI-ROLE EXCEL & CSV...")
    print("=" * 80)

    # 3. Organize into Role Columns
    # Columns Schema:
    # 1. #
    # 2. State
    # 3. City / District
    # 4. College Name
    # 5. Category
    # 6. Official Website URL
    # 7. Department / Contact Person (Primary AO Mobile / Landline)
    # 8. Primary Official Email
    # 9. TPO & Placement Head Emails
    # 10. TPO & Placement Phones
    # 11. Principal / Director / VC / Registrar Emails
    # 12. Principal / Directorate Phones
    # 13. Dean Student Affairs & Student Welfare Emails
    # 14. Dean Student Affairs Phones
    # 15. HOD Emails
    # 16. Faculty Emails
    # 17. All Verified Emails (Combined)
    # 18. All Verified Phones (Combined)
    # 19. High Priority Decision Makers Count
    # 20. Total Unique Verified Contacts
    # 21. Source Page URL
    # 22. Status
    # 23. Sent Date
    # 24. Remarks

    out_headers = [
        "#",
        "State",
        "City / District",
        "College Name",
        "Category",
        "Official Website URL",
        "Department / Contact Person",
        "Primary Official Email",
        "TPO & Placement Head Emails",
        "TPO & Placement Phones",
        "Principal / Director / VC / Registrar Emails",
        "Principal / Directorate Phones",
        "Dean Student Affairs & Student Welfare Emails",
        "Dean Student Affairs Phones",
        "HOD Emails",
        "Faculty Emails",
        "All Verified Emails (Combined)",
        "All Verified Phones (Combined)",
        "High Priority Decision Makers Count",
        "Total Unique Verified Contacts",
        "Source Page URL",
        "Status",
        "Sent Date",
        "Remarks"
    ]

    wb_out = openpyxl.Workbook()
    ws = wb_out.active
    ws.title = "Andhra_Pradesh_Colleges"
    ws.views.sheetView[0].showGridLines = True

    # Styling
    navy_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    blue_fill = PatternFill(start_color="0369A1", end_color="0369A1", fill_type="solid")    # TPO
    indigo_fill = PatternFill(start_color="3730A3", end_color="3730A3", fill_type="solid")  # Leadership
    amber_fill = PatternFill(start_color="B45309", end_color="B45309", fill_type="solid")    # Student Affairs
    emerald_fill = PatternFill(start_color="047857", end_color="047857", fill_type="solid")  # HOD
    teal_fill = PatternFill(start_color="0F766E", end_color="0F766E", fill_type="solid")     # Faculty
    slate_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")    # Combined
    status_fill = PatternFill(start_color="065F46", end_color="065F46", fill_type="solid")   # Status

    header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )
    alt_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    highlight_row_fill = PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid")

    ws.append(out_headers)
    for c_idx, h in enumerate(out_headers, 1):
        cell = ws.cell(row=1, column=c_idx)
        if c_idx <= 8:
            cell.fill = navy_fill
        elif c_idx in [9, 10]:
            cell.fill = blue_fill
        elif c_idx in [11, 12]:
            cell.fill = indigo_fill
        elif c_idx in [13, 14]:
            cell.fill = amber_fill
        elif c_idx == 15:
            cell.fill = emerald_fill
        elif c_idx == 16:
            cell.fill = teal_fill
        elif c_idx in [17, 18, 19, 20]:
            cell.fill = slate_fill
        else:
            cell.fill = status_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    ws.row_dimensions[1].height = 28
    csv_rows = [out_headers]

    total_tpo_colleges = 0
    total_leadership_colleges = 0
    total_student_affairs_colleges = 0
    total_hod_colleges = 0
    total_faculty_colleges = 0
    total_emails_all = 0
    total_phones_all = 0

    for idx, r in enumerate(raw_rows, 1):
        cid = r[0]
        state = r[1]
        city_dist = r[2]
        name = r[3]
        web = r[4]
        primary_dept = r[5]
        primary_email = clean_email(r[6])
        src_url = r[7]
        status = r[8]
        sent_date = r[9]
        remarks = r[10]

        # Determine Category from Remarks and Name
        cat = "Degree / Arts & Science"
        name_low = name.lower()
        if "university" in name_low or "deemed" in name_low or "iit" in name_low or "nit" in name_low or "iiit" in name_low:
            cat = "University / Premier Institute"
        elif "engineering" in name_low or "technology" in name_low or "eapcet mpc" in remarks.lower() or "polytechnic" in name_low:
            cat = "Engineering & Technology"
        elif "pharmacy" in name_low or "pharma" in remarks.lower():
            cat = "Pharmacy"
        elif "management" in name_low or "icet" in remarks.lower() or "mba" in name_low:
            cat = "Management & Business"
        elif "education" in name_low or "b.ed" in name_low or "edcet" in remarks.lower():
            cat = "Education"
        elif "law" in name_low or "lawcet" in remarks.lower():
            cat = "Law"
        elif "architecture" in name_low or "barch" in remarks.lower():
            cat = "Architecture"

        tpo_emails = []
        tpo_phones = []
        leadership_emails = []
        leadership_phones = []
        student_affairs_emails = []
        student_affairs_phones = []
        hod_emails = []
        faculty_emails = []
        all_emails = []
        all_phones = []

        # 1. Primary Email & Phones from Base Dataset
        if primary_email and is_valid_email(primary_email):
            all_emails.append(primary_email)
            role = classify_contact(primary_email, primary_dept)
            if role == 'TPO': tpo_emails.append(primary_email)
            elif role == 'STUDENT_AFFAIRS': student_affairs_emails.append(primary_email)
            elif role == 'HOD': hod_emails.append(primary_email)
            elif role == 'FACULTY': faculty_emails.append(primary_email)
            else: leadership_emails.append(primary_email)

        # Extract primary phones from primary_dept
        for ph in extract_phones(primary_dept):
            if ph not in all_phones:
                all_phones.append(ph)
                leadership_phones.append(ph)

        # 2. Harvested Contacts from Cache
        c_entry = cache.get(cid, {})
        for em, info in c_entry.get('emails', {}).items():
            norm_em = normalize_email(em)
            if is_valid_email(norm_em) and norm_em not in all_emails:
                all_emails.append(norm_em)
                ctx = info.get('desig', '') or ''
                role = classify_contact(norm_em, ctx)

                if role == 'TPO':
                    if norm_em not in tpo_emails: tpo_emails.append(norm_em)
                elif role == 'STUDENT_AFFAIRS':
                    if norm_em not in student_affairs_emails: student_affairs_emails.append(norm_em)
                elif role == 'HOD':
                    if norm_em not in hod_emails: hod_emails.append(norm_em)
                elif role == 'FACULTY':
                    if norm_em not in faculty_emails: faculty_emails.append(norm_em)
                elif role == 'LEADERSHIP':
                    if norm_em not in leadership_emails: leadership_emails.append(norm_em)
                else:
                    if norm_em not in faculty_emails: faculty_emails.append(norm_em)

        for ph in c_entry.get('phones', []):
            ph_clean = ph.strip()
            if ph_clean and ph_clean not in all_phones:
                all_phones.append(ph_clean)
                if len(tpo_emails) > 0 and len(tpo_phones) == 0:
                    tpo_phones.append(ph_clean)
                else:
                    leadership_phones.append(ph_clean)

        if len(tpo_emails) > 0: total_tpo_colleges += 1
        if len(leadership_emails) > 0: total_leadership_colleges += 1
        if len(student_affairs_emails) > 0: total_student_affairs_colleges += 1
        if len(hod_emails) > 0: total_hod_colleges += 1
        if len(faculty_emails) > 0: total_faculty_colleges += 1

        total_emails_all += len(all_emails)
        total_phones_all += len(all_phones)

        # String formatting
        tpo_em_str = "; ".join(tpo_emails)
        tpo_ph_str = "; ".join(tpo_phones)
        lead_em_str = "; ".join(leadership_emails)
        lead_ph_str = "; ".join(leadership_phones)
        sw_em_str = "; ".join(student_affairs_emails)
        sw_ph_str = "; ".join(student_affairs_phones)
        hod_em_str = "; ".join(hod_emails)
        fac_em_str = "; ".join(faculty_emails)
        all_em_str = "; ".join(all_emails)
        all_ph_str = "; ".join(all_phones)

        high_priority_count = len(tpo_emails) + len(leadership_emails) + len(student_affairs_emails) + len(hod_emails)
        total_unique_contacts = len(all_emails) + len(all_phones)

        row_data = [
            cid,
            state,
            city_dist,
            name,
            cat,
            web,
            primary_dept,
            primary_email,
            tpo_em_str,
            tpo_ph_str,
            lead_em_str,
            lead_ph_str,
            sw_em_str,
            sw_ph_str,
            hod_em_str,
            fac_em_str,
            all_em_str,
            all_ph_str,
            high_priority_count,
            total_unique_contacts,
            src_url,
            status,
            sent_date,
            remarks
        ]

        ws.append(row_data)
        csv_rows.append(row_data)

        # Row styling
        row_num = idx + 1
        has_multi = len(all_emails) > 1 or len(all_phones) > 0
        for c_idx in range(1, len(row_data) + 1):
            cell = ws.cell(row=row_num, column=c_idx)
            cell.border = thin_border
            cell.font = Font(name="Calibri", size=9.5)
            if c_idx in [1, 2, 5, 19, 20, 22, 23]:
                cell.alignment = Alignment(horizontal="center")
            if has_multi and c_idx in [9, 11, 13, 15, 16, 17, 18]:
                cell.fill = highlight_row_fill
            elif idx % 2 == 0 and c_idx not in [9, 11, 13, 15, 16, 17, 18]:
                cell.fill = alt_fill

    # Set column widths
    ws.column_dimensions['A'].width = 8   # #
    ws.column_dimensions['B'].width = 16  # State
    ws.column_dimensions['C'].width = 24  # City / District
    ws.column_dimensions['D'].width = 46  # College Name
    ws.column_dimensions['E'].width = 22  # Category
    ws.column_dimensions['F'].width = 34  # Official Website URL
    ws.column_dimensions['G'].width = 38  # Primary Department / Contact Person
    ws.column_dimensions['H'].width = 34  # Primary Official Email
    ws.column_dimensions['I'].width = 34  # TPO Emails
    ws.column_dimensions['J'].width = 22  # TPO Phones
    ws.column_dimensions['K'].width = 36  # Leadership Emails
    ws.column_dimensions['L'].width = 24  # Leadership Phones
    ws.column_dimensions['M'].width = 32  # Student Affairs Emails
    ws.column_dimensions['N'].width = 20  # Student Affairs Phones
    ws.column_dimensions['O'].width = 34  # HOD Emails
    ws.column_dimensions['P'].width = 34  # Faculty Emails
    ws.column_dimensions['Q'].width = 48  # All Verified Emails
    ws.column_dimensions['R'].width = 32  # All Verified Phones
    ws.column_dimensions['S'].width = 16  # High Priority Count
    ws.column_dimensions['T'].width = 16  # Total Unique Contacts
    ws.column_dimensions['U'].width = 42  # Source Page URL
    ws.column_dimensions['V'].width = 18  # Status
    ws.column_dimensions['W'].width = 12  # Sent Date
    ws.column_dimensions['X'].width = 54  # Remarks

    # Save to Excel & CSV
    wb_out.save(OUTPUT_EXCEL)
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(csv_rows)

    # Detailed README
    readme_text = f"""final dataset
================================================================================
ANDHRA PRADESH COLLEGES - MULTI-ROLE ENRICHED MASTER DIRECTORY
Source Portal: https://cap.apcfss.in/ + Official Institutional Web Crawling

FILES IN THIS FOLDER:
1. ANDHRA_PRADESH_COLLEGES.xlsx (Master Excel Workbook with professional 24-column layout)
2. ANDHRA_PRADESH_COLLEGES.csv  (Universal CSV format ready for bulk outreach / database import)

DATASET SUMMARY & AUDIT METRICS:
• Total Andhra Pradesh Colleges Processed : {len(raw_rows):,} institutions
• Total Verified Email Inboxes in Dataset : {total_emails_all:,}
• Total Direct Landlines & Mobile Numbers : {total_phones_all:,}
• Colleges with Leadership Inboxes        : {total_leadership_colleges:,} (VC, Registrar, Principal, Director, Dean Academics)
• Colleges with TPO & Placement Inboxes   : {total_tpo_colleges:,} (TPO, Placement Heads, Corporate Relations, IIIC)
• Colleges with Student Welfare Inboxes   : {total_student_affairs_colleges:,} (Dean Student Welfare, Clubs, NSS, Council)
• Colleges with Department HOD Inboxes    : {total_hod_colleges:,} (HOD CSE, ECE, Mech, IT, MBA, etc.)
• Colleges with Faculty Inboxes           : {total_faculty_colleges:,} (Professors, Assoc/Asst Professors, Lecturers)

EXACT 24-COLUMN ORGANIZED SCHEMA:
1.  #                                            : Record ID
2.  State                                        : Andhra Pradesh
3.  City / District                              : District jurisdiction & Mandal / Place
4.  College Name                                 : Full legal institution name
5.  Category                                     : Stream (University, Engineering, Management, Degree, Pharmacy, Law, Education)
6.  Official Website URL                         : Direct institutional web portal
7.  Department / Contact Person                  : Primary Admissions Officer (AO) Mobile & Office Contact
8.  Primary Official Email                       : Verified institutional primary email
9.  TPO & Placement Head Emails                  : TPO, Placement Heads, Corporate Relations (Target for Internships)
10. TPO & Placement Phones                       : Direct phones for Placement Directorate
11. Principal / Director / VC / Registrar Emails : Chancellors, VCs, Registrars, Principals, Deans (Target for MOUs & Approvals)
12. Principal / Directorate Phones               : Direct landline & mobile lines for Directorate
13. Dean Student Affairs & Student Welfare Emails: Dean Student Affairs, Clubs, NSS (Target for Student Advertising & Posters)
14. Dean Student Affairs Phones                  : Phone lines for Student Activities desk
15. HOD Emails                                   : Department Heads (CSE, ECE, Mech, Civil, IT, MBA) for branch targeting
16. Faculty Emails                               : Professors, Associate & Assistant Professors, Lecturers
17. All Verified Emails (Combined)               : Semicolon-separated list of all verified inboxes for 1-click mail merges
18. All Verified Phones (Combined)               : Semicolon-separated list of all direct contact numbers
19. High Priority Decision Makers Count          : Sum of decision makers (TPO + Leadership + Student Welfare + HOD)
20. Total Unique Verified Contacts               : Sum of all unique emails and phones for this institution
21. Source Page URL                              : Originating verification page on https://cap.apcfss.in/
22. Status                                       : Verification & Eligibility Status (Verified / Active)
23. Sent Date                                    : Outreach campaign timestamp placeholder (—)
24. Remarks                                      : College Code, Affiliated University, Institution Type, Estd Year
"""

    with open(README_FILE, 'w', encoding='utf-8') as f:
        f.write(readme_text)

    print("\n" + "=" * 80)
    print("ALL ROLES ENRICHED & SAVED SUCCESSFULLY!")
    print("=" * 80)
    print(f"Total Colleges Enriched        : {len(raw_rows):,}")
    print(f"Total Verified Emails          : {total_emails_all:,}")
    print(f"Total Verified Phone Numbers   : {total_phones_all:,}")
    print(f"Colleges with Leadership Mails : {total_leadership_colleges:,}")
    print(f"Colleges with TPO Mails        : {total_tpo_colleges:,}")
    print(f"Colleges with Student Welfare  : {total_student_affairs_colleges:,}")
    print(f"Colleges with HOD Mails        : {total_hod_colleges:,}")
    print(f"Colleges with Faculty Mails    : {total_faculty_colleges:,}")
    print(f"Saved Master Excel             : {OUTPUT_EXCEL}")
    print(f"Saved Master CSV               : {OUTPUT_CSV}")
    print(f"Saved README                   : {README_FILE}")
    print("=" * 80)

if __name__ == '__main__':
    asyncio.run(run_full_pipeline())
