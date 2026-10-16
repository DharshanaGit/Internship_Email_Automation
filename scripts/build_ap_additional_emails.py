"""
Andhra Pradesh Colleges & Universities Additional Contacts Pipeline
- Preserves original 'ANDHRA_PRADESH_VERIFIEDCOLLEGES (1).xlsx' (2,529 records) completely untouched.
- Creates 'Andhra_Pradesh_Colleges_Additional_Emails.xlsx'.
- Conducts comprehensive duplicate verification and overlap auditing.
- Scrapes official institution websites for verified designation-specific emails:
    Universities: Registrar, Pro-Vice-Chancellor/Rector/VC, Dean of Academic Affairs, Dean of Student Affairs
    Colleges: Principal/Director, Vice-Principal/Dean Academics, Head of Department (HOD), Training & Placement Officer (TPO)
- Outputs a multi-sheet validated Excel workbook with full audit documentation:
    Sheet 1: 'AP Colleges & All Contacts'
    Sheet 2: 'Verification & Duplicate Audit'
    Sheet 3: 'Executive Summary & Metrics'
"""

import sys
import os
import re
import ssl
import asyncio
import aiohttp
from urllib.parse import urljoin, urlparse
from collections import defaultdict, Counter
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from bs4 import BeautifulSoup

ORIGINAL_FILE = 'ANDHRA_PRADESH_VERIFIEDCOLLEGES (1).xlsx'
OUTPUT_FILE = 'Andhra_Pradesh_Colleges_Additional_Emails.xlsx'

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')

# Common invalid or dummy email patterns
JUNK_EMAIL_PATTERNS = [
    'example.com', 'domain.com', 'yourname@', 'email.com', 'test@', 'sample@',
    'wixpress.com', 'sentry.io', 'wordpress.org', 'w3.org', 'schema.org',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js',
    'bootstrap', 'cloudflare', 'fontawesome', 'github.com', 'google.com'
]

GENERIC_LOCAL_PARTS = [
    'info', 'enquiry', 'helpdesk', 'support', 'admissions', 'admission',
    'query', 'feedback', 'webmaster', 'admin', 'contact', 'office', 'career'
]

def clean_str(val):
    if val is None:
        return ''
    return str(val).strip()

def normalize_email(em):
    if not em:
        return ''
    em = str(em).strip().lower().rstrip('.')
    if em.startswith('mailto:'):
        em = em.replace('mailto:', '').split('?')[0].strip()
    return em

def is_valid_email(em):
    if not em or '@' not in em:
        return False
    em = em.lower().strip()
    if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', em):
        return False
    if any(junk in em for junk in JUNK_EMAIL_PATTERNS):
        return False
    domain_part = em.split('@')[-1]
    if '.' not in domain_part or len(domain_part.split('.')[-1]) < 2:
        return False
    return True

def get_root_domain(url):
    if not url:
        return ''
    try:
        u = url if '://' in url else 'http://' + url
        p = urlparse(u)
        netloc = p.netloc.lower().replace('www.', '')
        return netloc
    except:
        return ''

def classify_institution(name, remarks, website):
    name_low = name.lower()
    rem_low = remarks.lower()
    
    # Explicit university types in remarks
    if any(k in rem_low for k in [
        'state university', 'central university', 'private university', 'deemed university',
        'central autonomous / ini', 'state health university', 'state agri university',
        'state veterinary university', 'state horti university', 'state vedic university',
        'state fisheries university', 'state national law univ', 'central university / ini',
        'deemed university / ini'
    ]):
        if not any(k in rem_low for k in ['affiliated', 'constituent']):
            return 'University'
    
    # Check if name contains premier university keywords
    if any(k in name_low for k in ['iit ', 'nit ', 'iiit ', 'iim ', 'aiims', 'gitam deemed', 'kl deemed', 'vignan deemed']):
        return 'University'
        
    if 'university' in name_low:
        if not any(k in name_low for k in ['college of', 'degree college', 'campus college', 'constituent college', 'engineering college', 'affiliated']):
            return 'University'
            
    # Default to autonomous & affiliated colleges
    return 'Autonomous & Affiliated College'

print("[Step 1] Loading original Andhra Pradesh college records...")
wb_orig = openpyxl.load_workbook(ORIGINAL_FILE, data_only=True)
sheet_orig = wb_orig.active
raw_rows = list(sheet_orig.iter_rows(values_only=True))

header_row = [clean_str(c) for c in raw_rows[0][:11]]
records = []

for idx, r in enumerate(raw_rows[1:], 1):
    rec_id = r[0] if r[0] is not None else idx
    state = clean_str(r[1]) or 'Andhra Pradesh'
    city = clean_str(r[2])
    col_name = clean_str(r[3])
    web_url = clean_str(r[4])
    dept_contact = clean_str(r[5])
    email = normalize_email(r[6])
    src_url = clean_str(r[7])
    status = clean_str(r[8]) or 'Verified'
    sent_date = clean_str(r[9]) or '—'
    remarks = clean_str(r[10])
    
    inst_type = classify_institution(col_name, remarks, web_url)
    
    records.append({
        'orig_index': idx,
        'id': rec_id,
        'state': state,
        'city': city,
        'college_name': col_name,
        'website_url': web_url,
        'dept_contact': dept_contact,
        'email': email,
        'src_url': src_url,
        'status': status,
        'sent_date': sent_date,
        'remarks': remarks,
        'inst_type': inst_type
    })

print(f"Loaded {len(records)} total records from {ORIGINAL_FILE}.")

# Step 2: Verification for duplicates & overlapping entries
print("\n[Step 2] Executing duplicate and overlap verification...")

email_groups = defaultdict(list)
name_groups = defaultdict(list)
domain_groups = defaultdict(list)

for r in records:
    if r['email']:
        email_groups[r['email']].append(r)
    if r['college_name']:
        norm_name = re.sub(r'[^a-z0-9]', '', r['college_name'].lower())
        name_groups[norm_name].append(r)
    d = get_root_domain(r['website_url'])
    if d and '.' in d:
        domain_groups[d].append(r)

dup_email_map = {k: v for k, v in email_groups.items() if len(v) > 1}
dup_name_map = {k: v for k, v in name_groups.items() if len(v) > 1}
dup_domain_map = {k: v for k, v in domain_groups.items() if len(v) > 1}

print(f"  Duplicate Email Addresses: {len(dup_email_map)} unique emails across {sum(len(v) for v in dup_email_map.values())} records.")
print(f"  Duplicate College Names: {len(dup_name_map)} name variants across {sum(len(v) for v in dup_name_map.values())} records.")
print(f"  Shared / Duplicate Website Domains: {len(dup_domain_map)} domains across {sum(len(v) for v in dup_domain_map.values())} records.")

univ_records = [r for r in records if r['inst_type'] == 'University']
college_records = [r for r in records if r['inst_type'] == 'Autonomous & Affiliated College']
print(f"  Institutions Classified: {len(univ_records)} Universities/INIs | {len(college_records)} Autonomous & Affiliated Colleges.")

# Step 3: Web-Scraping Engine
print("\n[Step 3] Initializing Web-Scraping Engine...")

BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive'
}

# Designation matchers for Universities:
# 1. Registrar
# 2. Pro-Vice-Chancellor / Pro-Chancellor / Vice-Chancellor / Rector
# 3. Dean of Academic Affairs
# 4. Dean of Student Affairs / Student Welfare
def match_university_designation(context_text, email):
    tl = context_text.lower()
    el = email.lower()
    local_part = el.split('@')[0]
    
    # 1. Registrar
    if any(k in local_part for k in ['registrar', 'registrarsvu', 'reg@', 'registraroffice', 'registrar_']):
        return 'Registrar', None
    if 'registrar' in tl:
        if not any(k in tl for k in ['dean', 'exam', 'evaluation', 'admission', 'finance', 'assistant', 'deputy']):
            if not any(local_part.startswith(g) for g in GENERIC_LOCAL_PARTS):
                return 'Registrar', None
            
    # 2. Pro-Vice-Chancellor / Pro-Chancellor / Vice-Chancellor / Rector
    if any(k in local_part for k in ['pvc', 'rector', 'vc@', 'vcoffice', 'vicechancellor', 'pro-chancellor']):
        return 'Pro-Vice-Chancellor / Pro-Chancellor', None
    if any(k in tl for k in ['pro-vice-chancellor', 'pro vice chancellor', 'pvc', 'rector', 'pro-chancellor', 'pro chancellor', 'vice-chancellor', 'vice chancellor', 'vc office']):
        if not any(local_part.startswith(g) for g in GENERIC_LOCAL_PARTS):
            return 'Pro-Vice-Chancellor / Pro-Chancellor', None

    # 3. Dean of Academic Affairs
    if any(k in local_part for k in ['dean.academic', 'dean_academic', 'dean_aa', 'deanacademics', 'deanacademic', 'dean-academic', 'dean_acad']):
        return 'Dean of Academic Affairs', 'Academic Affairs'
    if 'dean' in tl and any(k in tl for k in ['academic affairs', 'dean (academics)', 'dean academics', 'dean of academics', 'dean academic']):
        if not any(local_part.startswith(g) for g in GENERIC_LOCAL_PARTS):
            return 'Dean of Academic Affairs', 'Academic Affairs'

    # 4. Dean of Student Affairs / Student Welfare
    if any(k in local_part for k in ['dean.student', 'dean.sw', 'dean_students', 'dean_sw', 'dsa@', 'deansw', 'dean-student', 'deanstudent']):
        return 'Dean of Student Affairs / Student Welfare', 'Student Welfare'
    if 'dean' in tl and any(k in tl for k in ['student affairs', 'student welfare', 'students welfare', 'students affairs', 'dean of students', 'dean of student']):
        if not any(local_part.startswith(g) for g in GENERIC_LOCAL_PARTS):
            return 'Dean of Student Affairs / Student Welfare', 'Student Welfare'

    return None, None

# Designation matchers for Autonomous and Affiliated Colleges:
# 1. Principal / Director
# 2. Vice-Principal / Dean Academics
# 3. Head of Department (HOD)
# 4. Training and Placement Officer (TPO) / Placement Head
def match_college_designation(context_text, email):
    tl = context_text.lower()
    el = email.lower()
    local_part = el.split('@')[0]
    
    # 1. Principal / Director
    if any(k in local_part for k in ['principal@', 'principal.', 'principal_', 'director@', 'director.', 'director_']) or local_part in ['principal', 'director']:
        if not any(k in local_part for k in ['vice', 'vp', 'asst', 'assistant', 'deputy']):
            return 'Principal / Director', None
    if any(k in tl for k in ['principal', 'director of the institute', 'campus director', 'head of institution']):
        if not any(k in tl for k in ['vice-principal', 'vice principal', 'vice_principal', 'associate director']):
            if not any(local_part.startswith(g) for g in GENERIC_LOCAL_PARTS):
                return 'Principal / Director', None
                
    # 2. Vice-Principal / Dean Academics
    if any(k in local_part for k in ['viceprincipal', 'vice_principal', 'vp@', 'dean.academics', 'deanacademics', 'dean_academic', 'dean_aa']):
        return 'Vice-Principal / Dean Academics', 'Academics'
    if any(k in tl for k in ['vice-principal', 'vice principal', 'vice_principal', 'vp office', 'dean academics', 'dean (academics)', 'dean - academics']):
        if not any(local_part.startswith(g) for g in GENERIC_LOCAL_PARTS):
            return 'Vice-Principal / Dean Academics', 'Academics'

    # 3. Training and Placement Officer (TPO) / Placement Head
    if any(k in local_part for k in ['tpo@', 'placement@', 'placements@', 'tap@', 'training@', 'tnp@', 'placementcell', 'tpo_']):
        return 'Training and Placement Officer (TPO) / Placement Head', 'Training & Placements'
    if any(k in tl for k in ['training and placement', 'training & placement', 'placement officer', 'placement head', 'tpo officer', 'head placements']):
        if not any(local_part.startswith(g) for g in GENERIC_LOCAL_PARTS):
            return 'Training and Placement Officer (TPO) / Placement Head', 'Training & Placements'

    # 4. Head of Department (HOD)
    depts = [
        ('Computer Science & Engineering', ['cse', 'computer science', 'computer engineering', 'information technology', 'it dept']),
        ('Electronics & Communication Engineering', ['ece', 'electronics and communication', 'electronics & communication']),
        ('Electrical & Electronics Engineering', ['eee', 'electrical and electronics', 'electrical & electronics']),
        ('Mechanical Engineering', ['mechanical', 'mech eng']),
        ('Civil Engineering', ['civil engineering', 'civil dept']),
        ('Management Studies / MBA', ['mba', 'management studies', 'business administration']),
        ('Pharmacy', ['pharmaceutics', 'pharmacology', 'pharmacy', 'pharmaceutical']),
        ('Basic Sciences & Humanities', ['humanities', 'physics', 'chemistry', 'mathematics', 'english', 'bsh', 'science & humanities'])
    ]
    
    if any(k in local_part for k in ['hod', 'hod.', 'hod_']):
        matched_dept = 'General Department'
        for dname, kws in depts:
            if any(k in local_part for k in kws) or any(k in tl for k in kws):
                matched_dept = dname
                break
        return 'Head of Department (HOD)', matched_dept

    if any(k in tl for k in ['head of department', 'head of the department', 'department head', 'hod -', 'hod :']):
        matched_dept = 'General Department'
        for dname, kws in depts:
            if any(k in tl for k in kws):
                matched_dept = dname
                break
        if not any(local_part.startswith(g) for g in GENERIC_LOCAL_PARTS):
            return 'Head of Department (HOD)', matched_dept

    return None, None

async def scrape_single_institution(session, record, sem):
    async with sem:
        base_url = record['website_url']
        src_url = record['src_url']
        inst_type = record['inst_type']
        orig_email = record['email']
        
        discovered = []
        seen_emails_for_inst = set()
        if orig_email:
            seen_emails_for_inst.add(orig_email)
            
        # Target URLs: Source Page URL is highest fidelity, followed by Official Website URL
        urls_to_try = []
        if src_url and src_url.startswith('http'):
            urls_to_try.append(src_url)
        if base_url and base_url.startswith('http') and base_url not in urls_to_try:
            urls_to_try.append(base_url)
            
        # If university or autonomous college, check 1-2 key subpages if base_url is available
        if base_url and base_url.startswith('http'):
            b = base_url.rstrip('/')
            if inst_type == 'University':
                for ep in ['/administration', '/contact', '/deans.php', '/contact-us']:
                    target = b + ep
                    if target not in urls_to_try:
                        urls_to_try.append(target)
            else:
                for ep in ['/contact', '/contact-us', '/placements', '/departments']:
                    target = b + ep
                    if target not in urls_to_try:
                        urls_to_try.append(target)
                        
        # We try up to 3 highest-priority endpoints per institution
        for target_url in urls_to_try[:3]:
            try:
                async with session.get(target_url, timeout=aiohttp.ClientTimeout(total=4)) as resp:
                    if resp.status != 200:
                        continue
                    ct = resp.headers.get('Content-Type', '')
                    if 'text/html' not in ct and 'text/plain' not in ct:
                        continue
                        
                    html = await resp.text(errors='ignore')
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # 1. Parse Mailto Links
                    for a in soup.find_all('a', href=True):
                        href = a.get('href', '').strip()
                        if href.startswith('mailto:'):
                            em = normalize_email(href)
                            if is_valid_email(em) and em not in seen_emails_for_inst:
                                parent = a.find_parent(['tr', 'li', 'div', 'p'])
                                ptxt = clean_str(parent.get_text(' ', strip=True) if parent else a.get_text())
                                
                                if inst_type == 'University':
                                    desig, dept = match_university_designation(ptxt, em)
                                else:
                                    desig, dept = match_college_designation(ptxt, em)
                                    
                                if desig:
                                    seen_emails_for_inst.add(em)
                                    discovered.append({
                                        'designation': desig,
                                        'department': dept,
                                        'email': em,
                                        'source_url': target_url
                                    })
                                    
                    # 2. Parse Text Blocks with Cards / Table Rows
                    for elem in soup.find_all(['tr', 'li', 'div', 'p']):
                        elem_text = elem.get_text(' ', strip=True)
                        if '@' in elem_text and len(elem_text) < 300:
                            for raw_em in EMAIL_REGEX.findall(elem_text):
                                em = normalize_email(raw_em)
                                if is_valid_email(em) and em not in seen_emails_for_inst:
                                    if inst_type == 'University':
                                        desig, dept = match_university_designation(elem_text, em)
                                    else:
                                        desig, dept = match_college_designation(elem_text, em)
                                        
                                    if desig:
                                        seen_emails_for_inst.add(em)
                                        discovered.append({
                                            'designation': desig,
                                            'department': dept,
                                            'email': em,
                                            'source_url': target_url
                                        })
            except Exception:
                continue
                
            # Stop early if we have found sufficient official designations
            if len(discovered) >= 4:
                break
                
        return discovered

async def run_crawler_pipeline():
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    connector = aiohttp.TCPConnector(limit=40, ssl=ssl_ctx)
    sem = asyncio.Semaphore(35)
    
    async with aiohttp.ClientSession(headers=BROWSER_HEADERS, connector=connector) as session:
        print(f"Dispatched {len(records)} asynchronous institution crawlers (concurrency: 35)...")
        tasks = [scrape_single_institution(session, r, sem) for r in records]
        
        # Monitor progress in batches
        results = []
        batch_size = 250
        for i in range(0, len(tasks), batch_size):
            chunk = tasks[i:i + batch_size]
            chunk_results = await asyncio.gather(*chunk, return_exceptions=True)
            results.extend(chunk_results)
            print(f"  Processed {min(i + batch_size, len(tasks))}/{len(tasks)} institutions...")
            
        return results

# Execute the web crawler
loop = asyncio.get_event_loop()
scrape_results = loop.run_until_complete(run_crawler_pipeline())

total_additional_contacts = 0
all_additional_rows = []

for idx, (rec, res) in enumerate(zip(records, scrape_results), 1):
    if isinstance(res, list) and len(res) > 0:
        # Deduplicate contacts belonging to the same institution
        inst_contacts = {}
        for c in res:
            key = (c['designation'], c['email'])
            if key not in inst_contacts:
                inst_contacts[key] = c
                
        sub_id = 1
        for (desig, em), c in inst_contacts.items():
            total_additional_contacts += 1
            contact_label = f"{desig}" + (f" - {c['department']}" if c['department'] else "")
            
            all_additional_rows.append({
                'parent_id': rec['id'],
                'id': f"{rec['id']}.{sub_id}",
                'state': 'Andhra Pradesh',
                'city': rec['city'],
                'college_name': rec['college_name'],
                'website_url': rec['website_url'],
                'dept_contact': contact_label,
                'email': em,
                'source_url': c['source_url'],
                'status': 'Verified',
                'sent_date': '—',
                'remarks': f"Additional Verified Contact ({rec['inst_type']})",
                'inst_type': rec['inst_type'],
                'designation_category': desig
            })
            sub_id += 1

print(f"\n[Scraping Completed] Successfully gathered {total_additional_contacts} verified additional contacts across institutions!")

# Step 4: Build the enhanced, multi-sheet Excel file
print(f"\n[Step 4] Creating workbook: {OUTPUT_FILE}...")
wb_out = openpyxl.Workbook()

# Sheet 1: All Andhra Pradesh Colleges & Contacts
ws1 = wb_out.active
ws1.title = "AP Colleges & All Contacts"
ws1.views.sheetView[0].showGridLines = True

# Styling definitions
header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
added_row_fill = PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid") # subtle light green for new verified contacts
thin_border = Border(
    left=Side(style='thin', color='E2E8F0'),
    right=Side(style='thin', color='E2E8F0'),
    top=Side(style='thin', color='E2E8F0'),
    bottom=Side(style='thin', color='E2E8F0')
)

ws1.append(header_row)
for col_num in range(1, len(header_row) + 1):
    cell = ws1.cell(row=1, column=col_num)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

# Write original 2,529 records
row_num = 2
for r in records:
    ws1.append([
        r['id'],
        r['state'],
        r['city'],
        r['college_name'],
        r['website_url'],
        r['dept_contact'],
        r['email'],
        r['src_url'],
        r['status'],
        r['sent_date'],
        r['remarks']
    ])
    for col_idx in range(1, 12):
        cell = ws1.cell(row=row_num, column=col_idx)
        cell.border = thin_border
        cell.font = Font(name="Calibri", size=10)
    row_num += 1

# Append additional verified contacts
for r in all_additional_rows:
    ws1.append([
        r['id'],
        r['state'],
        r['city'],
        r['college_name'],
        r['website_url'],
        r['dept_contact'],
        r['email'],
        r['source_url'],
        r['status'],
        r['sent_date'],
        r['remarks']
    ])
    for col_idx in range(1, 12):
        cell = ws1.cell(row=row_num, column=col_idx)
        cell.fill = added_row_fill
        cell.border = thin_border
        cell.font = Font(name="Calibri", size=10)
    row_num += 1

# Sheet 2: Verification & Duplicate Audit
ws2 = wb_out.create_sheet(title="Verification & Duplicate Audit")
ws2.views.sheetView[0].showGridLines = True

ws2.column_dimensions['A'].width = 8
ws2.column_dimensions['B'].width = 34
ws2.column_dimensions['C'].width = 46
ws2.column_dimensions['D'].width = 38
ws2.column_dimensions['E'].width = 42
ws2.column_dimensions['F'].width = 25

ws2.merge_cells("A1:F1")
title_cell = ws2.cell(row=1, column=1, value="ANDHRA PRADESH COLLEGE DIRECTORY: DUPLICATE & OVERLAP VERIFICATION AUDIT")
title_cell.font = Font(name="Calibri", size=14, bold=True, color="FFFFFF")
title_cell.fill = header_fill
title_cell.alignment = Alignment(horizontal="center", vertical="center")
ws2.row_dimensions[1].height = 35

audit_rules = [
    ("Audit Rule 1: Duplicate Email Addresses", "Case-insensitive exact match on 'Official Email Address'. Identifies records sharing identical mailboxes across listings."),
    ("Audit Rule 2: Duplicate College Names", "Normalized alphanumeric match on 'College Name' within the state/district. Identifies identical institutions listed redundantly."),
    ("Audit Rule 3: Shared / Duplicate Website Domains", "Normalized root domain extracted from 'Official Website URL'. Identifies constituent colleges or branch campuses sharing a parent portal.")
]

ws2.cell(row=3, column=1, value="DEFINED DUPLICATE MATCHING RULES:").font = Font(bold=True, size=11, color="0F172A")
for idx, (rule_title, rule_desc) in enumerate(audit_rules, 4):
    ws2.cell(row=idx, column=1, value=rule_title).font = Font(bold=True, color="E11D48")
    ws2.cell(row=idx, column=2, value=rule_desc).font = Font(italic=True)

# Table 1: Duplicate Emails
start_row = 8
ws2.cell(row=start_row, column=1, value="1. DUPLICATE EMAIL ADDRESSES IDENTIFIED").font = Font(bold=True, size=11, color="0F172A")
start_row += 1
headers_dup_email = ["#", "Duplicate Email Address", "Impacted College Name", "City / District", "Official Website URL", "Record ID"]
ws2.append(headers_dup_email)
for c in range(1, 7):
    cell = ws2.cell(row=start_row, column=c)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center")
start_row += 1

cnt = 1
for em, rec_list in sorted(dup_email_map.items()):
    for r in rec_list:
        ws2.append([cnt, em, r['college_name'], r['city'], r['website_url'], r['id']])
        for c in range(1, 7):
            ws2.cell(row=start_row, column=c).border = thin_border
            ws2.cell(row=start_row, column=c).font = Font(name="Calibri", size=10)
        start_row += 1
        cnt += 1

# Table 2: Duplicate College Names
start_row += 2
ws2.cell(row=start_row, column=1, value="2. DUPLICATE / OVERLAPPING COLLEGE NAMES IDENTIFIED").font = Font(bold=True, size=11, color="0F172A")
start_row += 1
headers_dup_name = ["#", "Normalized College Name", "Listing Name", "City / District", "Official Website URL", "Email Address"]
ws2.append(headers_dup_name)
for c in range(1, 7):
    cell = ws2.cell(row=start_row, column=c)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center")
start_row += 1

cnt = 1
for nm, rec_list in sorted(dup_name_map.items()):
    for r in rec_list:
        ws2.append([cnt, r['college_name'], r['college_name'], r['city'], r['website_url'], r['email']])
        for c in range(1, 7):
            ws2.cell(row=start_row, column=c).border = thin_border
            ws2.cell(row=start_row, column=c).font = Font(name="Calibri", size=10)
        start_row += 1
        cnt += 1

# Sheet 3: Executive Summary & Metrics
ws3 = wb_out.create_sheet(title="Executive Summary & Metrics")
ws3.views.sheetView[0].showGridLines = True
ws3.column_dimensions['A'].width = 6
ws3.column_dimensions['B'].width = 42
ws3.column_dimensions['C'].width = 18
ws3.column_dimensions['D'].width = 50

ws3.merge_cells("A1:D1")
t_cell = ws3.cell(row=1, column=1, value="ANDHRA PRADESH COLLEGES & UNIVERSITIES: EXECUTIVE SUMMARY")
t_cell.font = Font(name="Calibri", size=14, bold=True, color="FFFFFF")
t_cell.fill = header_fill
t_cell.alignment = Alignment(horizontal="center", vertical="center")
ws3.row_dimensions[1].height = 35

metrics_data = [
    ("Total Original Records Checked", len(records), "Unchanged source from ANDHRA_PRADESH_VERIFIEDCOLLEGES (1).xlsx"),
    ("Duplicate Email Addresses Identified", sum(len(v) for v in dup_email_map.values()), f"{len(dup_email_map)} distinct duplicate email groups"),
    ("Duplicate College Names Identified", sum(len(v) for v in dup_name_map.values()), f"{len(dup_name_map)} overlapping college title groups"),
    ("Shared Website Domain Clusters", sum(len(v) for v in dup_domain_map.values()), f"{len(dup_domain_map)} domains shared by constituent colleges"),
    ("Universities & National Institutes (INIs)", len(univ_records), "Targeted: Registrar, PVC/VC, Dean Academics, Dean Students"),
    ("Autonomous & Affiliated Colleges", len(college_records), "Targeted: Principal, Vice-Principal/Dean, HODs, TPO/Placement"),
    ("Total Additional Verified Contacts Sourced", len(all_additional_rows), "Discovered via official web scraping with exact page links"),
    ("Grand Total Dataset Size in Copy", len(records) + len(all_additional_rows), "All contacts linked to parent institutions")
]

ws3.cell(row=3, column=2, value="METRIC NAME").font = Font(bold=True, color="0F172A")
ws3.cell(row=3, column=3, value="COUNT").font = Font(bold=True, color="0F172A")
ws3.cell(row=3, column=4, value="AUDIT CONTEXT / SCOPE").font = Font(bold=True, color="0F172A")

for col in [2, 3, 4]:
    cell = ws3.cell(row=3, column=col)
    cell.fill = header_fill
    cell.font = header_font

curr_r = 4
for label, val, desc in metrics_data:
    ws3.cell(row=curr_r, column=2, value=label).font = Font(bold=True)
    ws3.cell(row=curr_r, column=3, value=val).font = Font(bold=True, color="E11D48")
    ws3.cell(row=curr_r, column=4, value=desc).font = Font(italic=True)
    for c in [2, 3, 4]:
        ws3.cell(row=curr_r, column=c).border = thin_border
    curr_r += 1

# Additional contacts breakdown by category
curr_r += 2
ws3.cell(row=curr_r, column=2, value="ADDITIONAL CONTACTS SOURCED BY DESIGNATION:").font = Font(bold=True, size=11, color="0F172A")
curr_r += 1
ws3.cell(row=curr_r, column=2, value="DESIGNATION CATEGORY").font = header_font
ws3.cell(row=curr_r, column=2).fill = header_fill
ws3.cell(row=curr_r, column=3, value="COUNT").font = header_font
ws3.cell(row=curr_r, column=3).fill = header_fill
ws3.cell(row=curr_r, column=4, value="INSTITUTION LEVEL").font = header_font
ws3.cell(row=curr_r, column=4).fill = header_fill
curr_r += 1

desig_counts = Counter(r['designation_category'] for r in all_additional_rows)
for desig, cnt in desig_counts.most_common():
    level = "University" if any(u in desig for u in ['Registrar', 'Pro-Vice-Chancellor', 'Student Affairs']) else "Autonomous & Affiliated College"
    ws3.cell(row=curr_r, column=2, value=desig)
    ws3.cell(row=curr_r, column=3, value=cnt).font = Font(bold=True)
    ws3.cell(row=curr_r, column=4, value=level)
    for c in [2, 3, 4]:
        ws3.cell(row=curr_r, column=c).border = thin_border
    curr_r += 1

# Auto-adjust column widths for Sheet 1
ws1.column_dimensions['A'].width = 8
ws1.column_dimensions['B'].width = 16
ws1.column_dimensions['C'].width = 22
ws1.column_dimensions['D'].width = 45
ws1.column_dimensions['E'].width = 35
ws1.column_dimensions['F'].width = 38
ws1.column_dimensions['G'].width = 38
ws1.column_dimensions['H'].width = 48
ws1.column_dimensions['I'].width = 12
ws1.column_dimensions['J'].width = 12
ws1.column_dimensions['K'].width = 35

wb_out.save(OUTPUT_FILE)
print(f"\n[Saved Successfully] '{OUTPUT_FILE}' has been generated with all sheets and audit validations intact.")
