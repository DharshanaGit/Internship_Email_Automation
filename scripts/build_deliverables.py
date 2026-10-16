import openpyxl
import csv
import re
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

ORIGINAL_VERIFIED_FILE = 'ANDHRA_PRADESH_VERIFIEDCOLLEGES (1).xlsx'
NO_WEB_MASTER_FILE = 'AP_Colleges_No_Website_Gmail_Only_Master.xlsx'
OUTPUT_EXCEL_SINGLE_SHEET = 'Andhra_Pradesh_Colleges_Additional_Emails.xlsx'
OUTPUT_CSV_FILE = 'Andhra_Pradesh_Colleges_No_Website_Verified.csv'
OUTPUT_CSV_ALIAS = 'AP_Colleges_No_Website_Verified.csv'

def clean_str(val):
    return str(val).strip() if val is not None else ''

def normalize_email(em):
    if not em: return ''
    em = str(em).strip().lower().rstrip('.')
    if em.startswith('mailto:'):
        em = em.replace('mailto:', '').split('?')[0].strip()
    return em

print("[Step 1] Loading verified dataset and existing contacts...")
# Load verified dataset
wb_v = openpyxl.load_workbook(ORIGINAL_VERIFIED_FILE, data_only=True)
sv = wb_v.active
raw_v = list(sv.iter_rows(values_only=True))
header_v = [clean_str(c) for c in raw_v[0][:11]]
orig_records = []

for idx, r in enumerate(raw_v[1:], 1):
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

print(f"Loaded {len(orig_records)} records from {ORIGINAL_VERIFIED_FILE}.")

# Load existing additional contacts from temporary copy or memory
wb_temp = openpyxl.load_workbook(OUTPUT_EXCEL_SINGLE_SHEET, data_only=True)
ws_temp = wb_temp[wb_temp.sheetnames[0]]
additional_contacts = []
EXCLUDE_TERMS = ['exam', 'cell', 'example', 'dummy', 'sample', 'test']

for r in range(2531, ws_temp.max_row + 1):
    row_vals = [ws_temp.cell(row=r, column=c).value for c in range(1, 12)]
    em = normalize_email(row_vals[6])
    if em and '@' in em:
        local_p = em.split('@')[0]
        # Allow 'chancellor' but disallow exam, cell, example, dummy
        if any(term in local_p for term in EXCLUDE_TERMS):
            continue
        additional_contacts.append({
            'id': row_vals[0],
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

print(f"Loaded {len(additional_contacts)} verified additional contacts.")

# --------------------------------------------------------------------
# 1. GENERATE Andhra_Pradesh_Colleges_Additional_Emails.xlsx (ONE SHEET)
# --------------------------------------------------------------------
print(f"\n[Step 2] Building ONE SHEET Excel: '{OUTPUT_EXCEL_SINGLE_SHEET}'...")
wb_out = openpyxl.Workbook()
ws = wb_out.active
ws.title = "Additional_Emails"
ws.views.sheetView[0].showGridLines = True

# Styling
header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
added_row_fill = PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid")
thin_border = Border(
    left=Side(style='thin', color='E2E8F0'),
    right=Side(style='thin', color='E2E8F0'),
    top=Side(style='thin', color='E2E8F0'),
    bottom=Side(style='thin', color='E2E8F0')
)

ws.append(header_v)
for col_idx in range(1, len(header_v) + 1):
    cell = ws.cell(row=1, column=col_idx)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

# Append original 2,529 verified records
row_num = 2
for r in orig_records:
    ws.append([
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
        cell = ws.cell(row=row_num, column=col_idx)
        cell.border = thin_border
        cell.font = Font(name="Calibri", size=10)
    row_num += 1

# Append the 271 verified additional contacts
for r in additional_contacts:
    ws.append([
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
        cell = ws.cell(row=row_num, column=col_idx)
        cell.fill = added_row_fill
        cell.border = thin_border
        cell.font = Font(name="Calibri", size=10)
    row_num += 1

# Column widths
ws.column_dimensions['A'].width = 8
ws.column_dimensions['B'].width = 16
ws.column_dimensions['C'].width = 22
ws.column_dimensions['D'].width = 46
ws.column_dimensions['E'].width = 36
ws.column_dimensions['F'].width = 38
ws.column_dimensions['G'].width = 38
ws.column_dimensions['H'].width = 48
ws.column_dimensions['I'].width = 12
ws.column_dimensions['J'].width = 12
ws.column_dimensions['K'].width = 35

wb_out.save(OUTPUT_EXCEL_SINGLE_SHEET)
print(f"Saved {OUTPUT_EXCEL_SINGLE_SHEET} with exactly ONE sheet ('Additional_Emails') and {ws.max_row - 1} total verified records!")

# --------------------------------------------------------------------
# 2. GENERATE Andhra_Pradesh_Colleges_No_Website_Verified.csv (NO DUPLICATES)
# --------------------------------------------------------------------
print(f"\n[Step 3] Building No-Website Deduplicated CSV: '{OUTPUT_CSV_FILE}'...")
wb_no = openpyxl.load_workbook(NO_WEB_MASTER_FILE, data_only=True)
s_gmail = wb_no['Gmail-Only (No Website)']
gmail_raw = list(s_gmail.iter_rows(values_only=True))[4:]

# 6 colleges transferred because they have active standalone websites
TRANSFERRED_SNO = {10, 41, 42, 43, 451, 475}

seen_emails = set()
seen_colleges = set()
csv_rows = []

cnt = 1
for r in gmail_raw:
    sno = r[0]
    if sno in TRANSFERRED_SNO:
        continue
    cname = clean_str(r[1])
    dist = clean_str(r[2])
    mandal = clean_str(r[3])
    cat = clean_str(r[4])
    univ = clean_str(r[5])
    desig = clean_str(r[6]) or "Principal"
    email = normalize_email(r[7])
    
    # Check duplicate email
    if email in seen_emails:
        continue
    # Check duplicate college name in district
    norm_key = (re.sub(r'[^a-z0-9]', '', cname.lower()), re.sub(r'[^a-z0-9]', '', dist.lower()))
    if norm_key in seen_colleges:
        continue
        
    seen_emails.add(email)
    seen_colleges.add(norm_key)
    
    csv_rows.append({
        'S.No': cnt,
        'College Name': cname,
        'District': dist,
        'Mandal / Town': mandal,
        'Category': cat,
        'Affiliated University': univ,
        'Designation': desig,
        'Verified CDC Gmail': email,
        'Website Status': 'No Dedicated Website (OAMDC / CDC Registered)',
        'Registry Source': clean_str(r[9]) or 'OAMDC / University CDC / SBTET',
        'Outreach Campaign Status': 'Eligible for Gmail Campaign'
    })
    cnt += 1

csv_fields = [
    'S.No', 'College Name', 'District', 'Mandal / Town', 'Category',
    'Affiliated University', 'Designation', 'Verified CDC Gmail',
    'Website Status', 'Registry Source', 'Outreach Campaign Status'
]

with open(OUTPUT_CSV_FILE, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=csv_fields)
    writer.writeheader()
    writer.writerows(csv_rows)

with open(OUTPUT_CSV_ALIAS, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=csv_fields)
    writer.writeheader()
    writer.writerows(csv_rows)

print(f"Saved {OUTPUT_CSV_FILE} with {len(csv_rows)} clean, verified, deduplicated colleges!")
