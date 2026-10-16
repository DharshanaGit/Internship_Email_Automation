import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from collections import defaultdict, Counter
import re

ORIGINAL_FILE = 'ANDHRA_PRADESH_VERIFIEDCOLLEGES (1).xlsx'
WORKBOOK_FILE = 'Andhra_Pradesh_Colleges_Additional_Emails.xlsx'

BLACKLIST = [
    'bgverifications', 'verifications', 'verification', 'callcentre', 'farmer',
    'enquiry', 'admissions', 'admission', 'helpdesk', 'feedback', 'query',
    'career', 'careers', 'webmaster', 'info@', 'support@'
]

def clean_str(val):
    return str(val).strip() if val is not None else ''

def normalize_email(em):
    if not em: return ''
    em = str(em).strip().lower().rstrip('.')
    if em.startswith('mailto:'):
        em = em.replace('mailto:', '').split('?')[0].strip()
    return em

print("[Finalizer] Loading original dataset and current workbook...")
wb_orig = openpyxl.load_workbook(ORIGINAL_FILE, data_only=True)
s_orig = wb_orig.active
raw_orig = list(s_orig.iter_rows(values_only=True))
header_row = [clean_str(c) for c in raw_orig[0][:11]]
orig_records = []

for idx, r in enumerate(raw_orig[1:], 1):
    rec_id = r[0] if r[0] is not None else idx
    orig_records.append({
        'id': rec_id,
        'state': clean_str(r[1]) or 'Andhra Pradesh',
        'city': clean_str(r[2]),
        'college_name': clean_str(r[3]),
        'website_url': clean_str(r[4]),
        'dept_contact': clean_str(r[5]),
        'email': normalize_email(r[6]),
        'src_url': clean_str(r[7]),
        'status': clean_str(r[8]) or 'Verified',
        'sent_date': clean_str(r[9]) or '—',
        'remarks': clean_str(r[10])
    })

# Compute duplicate metrics on original records
email_groups = defaultdict(list)
name_groups = defaultdict(list)
domain_groups = defaultdict(list)

for r in orig_records:
    if r['email']:
        email_groups[r['email']].append(r)
    if r['college_name']:
        norm_name = re.sub(r'[^a-z0-9]', '', r['college_name'].lower())
        name_groups[norm_name].append(r)
    web = r['website_url']
    if web:
        try:
            from urllib.parse import urlparse
            p = urlparse(web if '://' in web else 'http://' + web)
            d = p.netloc.lower().replace('www.', '')
            if d and '.' in d:
                domain_groups[d].append(r)
        except:
            pass

dup_email_map = {k: v for k, v in email_groups.items() if len(v) > 1}
dup_name_map = {k: v for k, v in name_groups.items() if len(v) > 1}
dup_domain_map = {k: v for k, v in domain_groups.items() if len(v) > 1}

# Load current workbook Sheet 1 to get the scraped contacts
wb_curr = openpyxl.load_workbook(WORKBOOK_FILE, data_only=True)
ws_curr = wb_curr['AP Colleges & All Contacts']

valid_additional = []
for r in range(2531, ws_curr.max_row + 1):
    row_vals = [ws_curr.cell(row=r, column=c).value for c in range(1, 12)]
    em = normalize_email(row_vals[6])
    if any(b in em for b in BLACKLIST):
        print(f"Filtering out non-designation contact: {row_vals[3]} -> {em}")
        continue
    valid_additional.append({
        'parent_id': str(row_vals[0]).split('.')[0],
        'state': row_vals[1] or 'Andhra Pradesh',
        'city': row_vals[2],
        'college_name': row_vals[3],
        'website_url': row_vals[4],
        'dept_contact': row_vals[5],
        'email': em,
        'src_url': row_vals[7],
        'status': row_vals[8] or 'Verified',
        'sent_date': row_vals[9] or '—',
        'remarks': row_vals[10] or 'Additional Verified Contact'
    })

print(f"Total verified additional contacts retained: {len(valid_additional)}")

# Group and assign clean sub-IDs per parent
parent_sub_counter = defaultdict(int)
for item in valid_additional:
    pid = item['parent_id']
    parent_sub_counter[pid] += 1
    item['id'] = f"{pid}.{parent_sub_counter[pid]}"

# Build clean final workbook
wb_final = openpyxl.Workbook()

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

# Sheet 1: AP Colleges & All Contacts
ws1 = wb_final.active
ws1.title = "AP Colleges & All Contacts"
ws1.views.sheetView[0].showGridLines = True

ws1.append(header_row)
for col_num in range(1, len(header_row) + 1):
    cell = ws1.cell(row=1, column=col_num)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

# Append original 2,529 records
row_num = 2
for r in orig_records:
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

# Append filtered additional verified contacts
for r in valid_additional:
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
        cell.fill = added_row_fill
        cell.border = thin_border
        cell.font = Font(name="Calibri", size=10)
    row_num += 1

# Auto-adjust column widths for Sheet 1
ws1.column_dimensions['A'].width = 8
ws1.column_dimensions['B'].width = 16
ws1.column_dimensions['C'].width = 22
ws1.column_dimensions['D'].width = 46
ws1.column_dimensions['E'].width = 36
ws1.column_dimensions['F'].width = 38
ws1.column_dimensions['G'].width = 38
ws1.column_dimensions['H'].width = 48
ws1.column_dimensions['I'].width = 12
ws1.column_dimensions['J'].width = 12
ws1.column_dimensions['K'].width = 35

# Sheet 2: Verification & Duplicate Audit
ws2 = wb_final.create_sheet(title="Verification & Duplicate Audit")
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
ws3 = wb_final.create_sheet(title="Executive Summary & Metrics")
ws3.views.sheetView[0].showGridLines = True
ws3.column_dimensions['A'].width = 6
ws3.column_dimensions['B'].width = 44
ws3.column_dimensions['C'].width = 18
ws3.column_dimensions['D'].width = 50

ws3.merge_cells("A1:D1")
t_cell = ws3.cell(row=1, column=1, value="ANDHRA PRADESH COLLEGES & UNIVERSITIES: EXECUTIVE SUMMARY")
t_cell.font = Font(name="Calibri", size=14, bold=True, color="FFFFFF")
t_cell.fill = header_fill
t_cell.alignment = Alignment(horizontal="center", vertical="center")
ws3.row_dimensions[1].height = 35

univ_cnt = sum(1 for r in orig_records if any(u in r['remarks'].lower() for u in ['state university', 'central university', 'private university', 'deemed university', 'central autonomous / ini']))
college_cnt = len(orig_records) - univ_cnt

metrics_data = [
    ("Total Original Records Checked", len(orig_records), "Unchanged source from ANDHRA_PRADESH_VERIFIEDCOLLEGES (1).xlsx"),
    ("Duplicate Email Addresses Identified", sum(len(v) for v in dup_email_map.values()), f"{len(dup_email_map)} distinct duplicate email groups"),
    ("Duplicate College Names Identified", sum(len(v) for v in dup_name_map.values()), f"{len(dup_name_map)} overlapping college title groups"),
    ("Shared Website Domain Clusters", sum(len(v) for v in dup_domain_map.values()), f"{len(dup_domain_map)} domains shared by constituent colleges"),
    ("Universities & National Institutes (INIs)", univ_cnt, "Targeted: Registrar, PVC/VC, Dean Academics, Dean Students"),
    ("Autonomous & Affiliated Colleges", college_cnt, "Targeted: Principal, Vice-Principal/Dean, HODs, TPO/Placement"),
    ("Total Additional Verified Contacts Sourced", len(valid_additional), "Discovered via official web scraping with exact page links"),
    ("Grand Total Dataset Size in Copy", len(orig_records) + len(valid_additional), "All contacts linked to parent institutions")
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

# Additional contacts breakdown by designation category
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

def categorize_desig(label):
    if 'Vice-Principal' in label or 'Dean Academics' in label: return 'Vice-Principal / Dean Academics', 'Autonomous & Affiliated College'
    if 'Principal' in label or 'Director' in label: return 'Principal / Director', 'Autonomous & Affiliated College'
    if 'HOD' in label or 'Head of Department' in label: return 'Head of Department (HOD)', 'Autonomous & Affiliated College'
    if 'Pro-Vice' in label or 'Pro-Chancellor' in label or 'Vice-Chancellor' in label: return 'Pro-Vice-Chancellor / Pro-Chancellor', 'University'
    if 'Placement' in label or 'TPO' in label: return 'Training and Placement Officer (TPO) / Placement Head', 'Autonomous & Affiliated College'
    if 'Registrar' in label: return 'Registrar', 'University'
    if 'Dean of Academic' in label: return 'Dean of Academic Affairs', 'University'
    if 'Student Affairs' in label: return 'Dean of Student Affairs / Student Welfare', 'University'
    return label, 'General'

desig_counter = Counter()
for r in valid_additional:
    c_name, _ = categorize_desig(r['dept_contact'])
    desig_counter[c_name] += 1

for desig, cnt in desig_counter.most_common():
    _, level = categorize_desig(desig)
    ws3.cell(row=curr_r, column=2, value=desig)
    ws3.cell(row=curr_r, column=3, value=cnt).font = Font(bold=True)
    ws3.cell(row=curr_r, column=4, value=level)
    for c in [2, 3, 4]:
        ws3.cell(row=curr_r, column=c).border = thin_border
    curr_r += 1

wb_final.save(WORKBOOK_FILE)
print(f"[Done] Clean, finalized workbook saved to {WORKBOOK_FILE}")
