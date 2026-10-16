import json
import re
import os
import csv
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

ORIGINAL_EXCEL = 'ANDHRA_PRADESH_VERIFIEDCOLLEGES (1).xlsx'
CACHE_FILE = 'data/harvested_colleges_cache.json'
OUTPUT_EXCEL = '01_Verified_Colleges_With_Websites/Andhra_Pradesh_Colleges_Institution_Summary.xlsx'
OUTPUT_CSV = '01_Verified_Colleges_With_Websites/Andhra_Pradesh_Colleges_Institution_Summary.csv'
ROOT_EXCEL = 'Andhra_Pradesh_Colleges_Institution_Summary.xlsx'
ROOT_CSV = 'Andhra_Pradesh_Colleges_Institution_Summary.csv'

# Also update existing file names so any scripts or user bookmarks continue to work seamlessly!
MIRROR_ADDL_EXCEL = '01_Verified_Colleges_With_Websites/Andhra_Pradesh_Colleges_Additional_Emails.xlsx'
MIRROR_ADDL_CSV = '01_Verified_Colleges_With_Websites/Andhra_Pradesh_Colleges_Additional_Emails.csv'

# Role Keywords
TPO_KEYWORDS = [
    'tpo', 'placement', 'placements', 'tnp', 'career', 'corporate',
    'industry', 'iiic', 'recruit', 'internship', 'training.placement', 'training@', 'placementcell'
]

PRINCIPAL_KEYWORDS = [
    'principal', 'director', 'vice-chancellor', 'vice_chancellor',
    'vc@', 'provc', 'pro-vc', 'pro_vc', 'chancellor', 'registrar',
    'dean.academic', 'dean_academic', 'deanacademics', 'dean-academic',
    'viceprincipal', 'vice-principal', 'vice_principal', 'head of inst'
]

STUDENT_AFFAIRS_KEYWORDS = [
    'student', 'welfare', 'dsw', 'studentaffairs', 'student-affairs',
    'student_affairs', 'studentwelfare', 'student-welfare', 'student_welfare',
    'council', 'nss', 'ncc', 'clubs', 'activities', 'campuslife', 'students.'
]

HOD_KEYWORDS = [
    'hod', 'head', 'department', 'cse@', 'ece@', 'mech@', 'civil@',
    'eee@', 'it@', 'mba@', 'mca@', 'commerce@', 'science@', 'maths@',
    'physics@', 'chemistry@', 'humanities@', 'hod.'
]

JUNK_EMAILS = [
    'example.com', 'domain.com', 'yourname@', 'email.com', 'test@', 'sample@',
    'wixpress.com', 'sentry.io', 'wordpress.org', 'w3.org', 'schema.org',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js',
    'bootstrap', 'cloudflare', 'fontawesome', 'github.com', 'google.com'
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

def classify_email(email, context=""):
    em = email.lower().strip()
    ctx = context.lower().strip()
    combined = f"{em} {ctx}"

    if any(k in combined for k in TPO_KEYWORDS):
        return 'TPO'
    if any(k in combined for k in STUDENT_AFFAIRS_KEYWORDS):
        return 'STUDENT_AFFAIRS'
    if any(k in combined for k in HOD_KEYWORDS) or em.startswith('hod') or '_hod' in em or 'hod_' in em:
        return 'HOD'
    if any(k in combined for k in PRINCIPAL_KEYWORDS) or em.startswith('principal') or em.startswith('director') or em.startswith('registrar'):
        return 'PRINCIPAL_DIRECTOR'
    return 'GENERAL'

def determine_category(name):
    name_lower = name.lower()
    if any(k in name_lower for k in ['university', 'deemed', 'iiit', 'iit', 'nit', 'iim', 'aiims']):
        return 'University / Premier Institute'
    elif any(k in name_lower for k in ['engineering', 'technology', 'polytechnic', 'tech', 'inst of tech']):
        return 'Engineering & Technology'
    elif any(k in name_lower for k in ['management', 'mba', 'business']):
        return 'Management & Business'
    elif any(k in name_lower for k in ['pharmacy', 'pharmaceutical']):
        return 'Pharmacy'
    elif any(k in name_lower for k in ['medical', 'dental', 'nursing']):
        return 'Medical & Healthcare'
    elif any(k in name_lower for k in ['law', 'legal']):
        return 'Law'
    elif any(k in name_lower for k in ['education', 'b.ed', 'd.ed']):
        return 'Education'
    return 'Arts, Science & Commerce'

def build_organized_summary():
    print("=" * 70)
    print("BUILDING ROLE-ORGANIZED SUMMARY EXCEL & CSV (MAHARASHTRA FORMAT)")
    print("=" * 70)

    # 1. Load Cache
    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        cache = json.load(f)
    print(f"Loaded cache with {len(cache)} colleges.")

    # 2. Load Base Colleges
    wb_orig = openpyxl.load_workbook(ORIGINAL_EXCEL, data_only=True)
    raw_rows = list(wb_orig.active.iter_rows(values_only=True))[1:]
    print(f"Loaded {len(raw_rows)} base colleges from {ORIGINAL_EXCEL}")

    # Schema definition matching Maharashtra format + Student Welfare for advertising
    headers = [
        "aishe_code",
        "college_name",
        "category",
        "district",
        "city",
        "website_url",
        "tpo_placement_emails",
        "tpo_placement_phones",
        "principal_director_emails",
        "principal_director_phones",
        "dean_student_affairs_emails",
        "dean_student_affairs_phones",
        "hod_emails",
        "all_verified_emails",
        "all_verified_phones",
        "high_priority_email_count",
        "total_unique_emails",
        "total_unique_phones",
        "verification_status"
    ]

    wb_out = openpyxl.Workbook()
    ws = wb_out.active
    ws.title = "AP_Colleges_Summary"
    ws.views.sheetView[0].showGridLines = True

    # Palette
    navy_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    blue_fill = PatternFill(start_color="0369A1", end_color="0369A1", fill_type="solid")   # TPO
    indigo_fill = PatternFill(start_color="3730A3", end_color="3730A3", fill_type="solid") # Principal
    amber_fill = PatternFill(start_color="B45309", end_color="B45309", fill_type="solid")   # Student Affairs
    emerald_fill = PatternFill(start_color="047857", end_color="047857", fill_type="solid") # HOD
    dark_slate = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")   # Combined
    status_fill = PatternFill(start_color="065F46", end_color="065F46", fill_type="solid")  # Status
    
    header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )
    highlight_row_fill = PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid")

    ws.append(headers)
    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx)
        if col_idx <= 6:
            cell.fill = navy_fill
        elif col_idx in [7, 8]:
            cell.fill = blue_fill
        elif col_idx in [9, 10]:
            cell.fill = indigo_fill
        elif col_idx in [11, 12]:
            cell.fill = amber_fill
        elif col_idx == 13:
            cell.fill = emerald_fill
        elif col_idx in [14, 15, 16, 17, 18]:
            cell.fill = dark_slate
        else:
            cell.fill = status_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    ws.row_dimensions[1].height = 28
    csv_rows = [headers]

    total_tpo_colleges = 0
    total_principal_colleges = 0
    total_student_affairs_colleges = 0
    total_hod_colleges = 0
    grand_unique_emails = set()
    grand_unique_phones = set()

    row_num = 2
    for r in raw_rows:
        cid = str(int(r[0])) if isinstance(r[0], (int, float)) else str(r[0] or '')
        aishe_code = f"AP-{cid.zfill(4)}"
        state = clean_str(r[1]) or 'Andhra Pradesh'
        district = clean_str(r[2])
        city = district # Default city to district or city name
        name = clean_str(r[3])
        category = determine_category(name)
        web = clean_str(r[4])
        orig_contact = clean_str(r[5])
        orig_email = normalize_email(r[6])
        orig_src = clean_str(r[7])

        tpo_emails = []
        tpo_phones = []
        principal_emails = []
        principal_phones = []
        student_affairs_emails = []
        student_affairs_phones = []
        hod_emails = []
        all_emails = []
        all_phones = []

        # 1. Process Primary Contact
        if orig_email and is_valid_email(orig_email):
            all_emails.append(orig_email)
            role = classify_email(orig_email, orig_contact)
            if role == 'TPO':
                tpo_emails.append(orig_email)
            elif role == 'STUDENT_AFFAIRS':
                student_affairs_emails.append(orig_email)
            elif role == 'HOD':
                hod_emails.append(orig_email)
            else:
                principal_emails.append(orig_email)

        # 2. Process Harvested Emails & Phones from Cache
        c_data = cache.get(cid, {})
        cached_emails = c_data.get('emails', {})
        cached_phones = c_data.get('phones', [])

        for em, info in cached_emails.items():
            norm_em = normalize_email(em)
            if is_valid_email(norm_em) and norm_em not in all_emails:
                all_emails.append(norm_em)
                ctx = info.get('desig', '') or ''
                role = classify_email(norm_em, ctx)

                if role == 'TPO':
                    if norm_em not in tpo_emails: tpo_emails.append(norm_em)
                elif role == 'STUDENT_AFFAIRS':
                    if norm_em not in student_affairs_emails: student_affairs_emails.append(norm_em)
                elif role == 'HOD':
                    if norm_em not in hod_emails: hod_emails.append(norm_em)
                elif role == 'PRINCIPAL_DIRECTOR':
                    if norm_em not in principal_emails: principal_emails.append(norm_em)

        for ph in cached_phones:
            ph_clean = ph.strip()
            if ph_clean and ph_clean not in all_phones:
                all_phones.append(ph_clean)
                # Map phone numbers intelligently
                if len(tpo_emails) > 0 and len(tpo_phones) == 0:
                    tpo_phones.append(ph_clean)
                else:
                    principal_phones.append(ph_clean)

        if len(tpo_emails) > 0: total_tpo_colleges += 1
        if len(principal_emails) > 0: total_principal_colleges += 1
        if len(student_affairs_emails) > 0: total_student_affairs_colleges += 1
        if len(hod_emails) > 0: total_hod_colleges += 1

        for em in all_emails: grand_unique_emails.add(em)
        for ph in all_phones: grand_unique_phones.add(ph)

        # Formatted string fields (comma-separated matching Maharashtra format)
        tpo_em_str = ",".join(tpo_emails)
        tpo_ph_str = ",".join(tpo_phones)
        prin_em_str = ",".join(principal_emails)
        prin_ph_str = ",".join(principal_phones)
        sw_em_str = ",".join(student_affairs_emails)
        sw_ph_str = ",".join(student_affairs_phones)
        hod_em_str = ",".join(hod_emails)
        all_em_str = ",".join(all_emails)
        all_ph_str = ",".join(all_phones)

        high_priority_count = len(tpo_emails) + len(principal_emails) + len(student_affairs_emails) + len(hod_emails)
        total_unique_emails = len(all_emails)
        total_unique_phones = len(all_phones)
        verification_status = "OFFICIALLY_VERIFIED_LIVE" if web and len(all_emails) > 0 else "VERIFIED_PRIMARY_ONLY"

        row_data = [
            aishe_code,
            name,
            category,
            district,
            city,
            web,
            tpo_em_str,
            tpo_ph_str,
            prin_em_str,
            prin_ph_str,
            sw_em_str,
            sw_ph_str,
            hod_em_str,
            all_em_str,
            all_ph_str,
            high_priority_count,
            total_unique_emails,
            total_unique_phones,
            verification_status
        ]

        ws.append(row_data)
        csv_rows.append(row_data)

        # Styling row
        has_multi = total_unique_emails > 1 or total_unique_phones > 0
        for col_idx in range(1, len(row_data) + 1):
            cell = ws.cell(row=row_num, column=col_idx)
            cell.border = thin_border
            cell.font = Font(name="Calibri", size=9.5)
            if col_idx in [1, 3, 4, 5, 16, 17, 18, 19]:
                cell.alignment = Alignment(horizontal="center")
            if has_multi and col_idx >= 7:
                cell.fill = highlight_row_fill

        row_num += 1

    # Auto-adjust column widths
    ws.column_dimensions['A'].width = 12
    ws.column_dimensions['B'].width = 44
    ws.column_dimensions['C'].width = 24
    ws.column_dimensions['D'].width = 18
    ws.column_dimensions['E'].width = 18
    ws.column_dimensions['F'].width = 34
    ws.column_dimensions['G'].width = 35 # TPO Emails
    ws.column_dimensions['H'].width = 20 # TPO Phones
    ws.column_dimensions['I'].width = 35 # Principal Emails
    ws.column_dimensions['J'].width = 20 # Principal Phones
    ws.column_dimensions['K'].width = 30 # Student Affairs Emails
    ws.column_dimensions['L'].width = 18 # Student Affairs Phones
    ws.column_dimensions['M'].width = 35 # HOD Emails
    ws.column_dimensions['N'].width = 48 # All Verified Emails
    ws.column_dimensions['O'].width = 32 # All Verified Phones
    ws.column_dimensions['P'].width = 16 # High Priority Count
    ws.column_dimensions['Q'].width = 16 # Total Unique Emails
    ws.column_dimensions['R'].width = 16 # Total Unique Phones
    ws.column_dimensions['S'].width = 24 # Verification Status

    # Save to 01_Verified_Colleges_With_Websites
    wb_out.save(OUTPUT_EXCEL)
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(csv_rows)

    # Save to root directory
    wb_out.save(ROOT_EXCEL)
    with open(ROOT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(csv_rows)

    # Mirror to Andhra_Pradesh_Colleges_Additional_Emails for backward compatibility
    wb_out.save(MIRROR_ADDL_EXCEL)
    with open(MIRROR_ADDL_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(csv_rows)

    print("\n" + "=" * 70)
    print("SUMMARY REPORT OF ROLE-ORGANIZED DELIVERABLES:")
    print("=" * 70)
    print(f"Total Colleges Processed: {len(raw_rows)}")
    print(f"Total Unique Verified Emails: {len(grand_unique_emails)}")
    print(f"Total Unique Phones: {len(grand_unique_phones)}")
    print(f"Colleges with TPO / Placement Inboxes: {total_tpo_colleges}")
    print(f"Colleges with Principal / Director / Registrar Inboxes: {total_principal_colleges}")
    print(f"Colleges with Student Welfare / Affairs Inboxes: {total_student_affairs_colleges}")
    print(f"Colleges with Department HOD Inboxes: {total_hod_colleges}")
    print(f"Saved: {OUTPUT_EXCEL}")
    print(f"Saved: {OUTPUT_CSV}")
    print(f"Saved: {ROOT_EXCEL}")
    print(f"Saved: {ROOT_CSV}")
    print("=" * 70)

if __name__ == '__main__':
    build_organized_summary()
