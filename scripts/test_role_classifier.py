import json
import re
import openpyxl

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')

# Role Classification Regexes
TPO_KEYWORDS = [
    'tpo', 'placement', 'placements', 'tnp', 'career', 'corporate',
    'industry', 'iiic', 'recruit', 'internship', 'training.placement'
]

PRINCIPAL_KEYWORDS = [
    'principal', 'director', 'vice-chancellor', 'vice_chancellor',
    'vc@', 'provc', 'pro-vc', 'pro_vc', 'chancellor', 'registrar',
    'dean.academic', 'dean_academic', 'deanacademics', 'dean-academic',
    'viceprincipal', 'vice-principal', 'vice_principal'
]

STUDENT_AFFAIRS_KEYWORDS = [
    'student', 'welfare', 'dsw', 'studentaffairs', 'student-affairs',
    'student_affairs', 'studentwelfare', 'student-welfare', 'student_welfare',
    'council', 'nss', 'ncc', 'clubs', 'activities', 'campuslife'
]

HOD_KEYWORDS = [
    'hod', 'head', 'department', 'cse@', 'ece@', 'mech@', 'civil@',
    'eee@', 'it@', 'mba@', 'mca@', 'commerce@', 'science@', 'maths@',
    'physics@', 'chemistry@', 'humanities@', 'hod.'
]

def classify_email(email, context=""):
    em = email.lower().strip()
    ctx = context.lower().strip()
    combined = f"{em} {ctx}"

    # Check TPO / Placement
    if any(k in combined for k in TPO_KEYWORDS):
        return 'TPO'
    
    # Check Dean Student Welfare / Student Affairs
    if any(k in combined for k in STUDENT_AFFAIRS_KEYWORDS):
        return 'STUDENT_AFFAIRS'

    # Check HOD / Department Head
    if any(k in combined for k in HOD_KEYWORDS) or em.startswith('hod') or '_hod' in em or 'hod_' in em:
        return 'HOD'

    # Check Principal / Director / Registrar / Deans
    if any(k in combined for k in PRINCIPAL_KEYWORDS) or em.startswith('principal') or em.startswith('director') or em.startswith('registrar'):
        return 'PRINCIPAL_DIRECTOR'

    return 'GENERAL'

# Test with current cache
with open('data/harvested_colleges_cache.json', 'r', encoding='utf-8') as f:
    cache = json.load(f)

wb = openpyxl.load_workbook('ANDHRA_PRADESH_VERIFIEDCOLLEGES (1).xlsx', data_only=True)
raw_rows = list(wb.active.iter_rows(values_only=True))[1:26]

print("TEST CLASSIFICATION ON FIRST 25 COLLEGES:")
print("=" * 80)
for r in raw_rows:
    cid = str(int(r[0])) if isinstance(r[0], (int, float)) else str(r[0] or '')
    name = r[3]
    orig_contact = str(r[5] or '')
    orig_email = str(r[6] or '').strip().lower()

    tpo_emails = set()
    principal_emails = set()
    student_affairs_emails = set()
    hod_emails = set()
    all_emails = set()

    # Primary contact classification
    if orig_email and '@' in orig_email:
        all_emails.add(orig_email)
        role = classify_email(orig_email, orig_contact)
        if role == 'TPO': tpo_emails.add(orig_email)
        elif role == 'STUDENT_AFFAIRS': student_affairs_emails.add(orig_email)
        elif role == 'HOD': hod_emails.add(orig_email)
        elif role == 'PRINCIPAL_DIRECTOR': principal_emails.add(orig_email)
        else: principal_emails.add(orig_email) # Default leadership for base listing

    # Cached harvested emails
    c_data = cache.get(cid, {})
    for em, info in c_data.get('emails', {}).items():
        em_clean = em.lower().strip()
        all_emails.add(em_clean)
        role = classify_email(em_clean, info.get('desig', ''))
        if role == 'TPO': tpo_emails.add(em_clean)
        elif role == 'STUDENT_AFFAIRS': student_affairs_emails.add(em_clean)
        elif role == 'HOD': hod_emails.add(em_clean)
        elif role == 'PRINCIPAL_DIRECTOR': principal_emails.add(em_clean)

    high_priority_count = len(tpo_emails) + len(principal_emails) + len(student_affairs_emails) + len(hod_emails)
    
    print(f"[{cid}] {name}")
    print(f"  TPO Emails ({len(tpo_emails)}): {', '.join(tpo_emails) or '—'}")
    print(f"  Principal/Director/Registrar ({len(principal_emails)}): {', '.join(list(principal_emails)[:3]) or '—'}")
    print(f"  Student Affairs ({len(student_affairs_emails)}): {', '.join(student_affairs_emails) or '—'}")
    print(f"  HOD Emails ({len(hod_emails)}): {', '.join(list(hod_emails)[:3]) or '—'}")
    print(f"  Total Unique: {len(all_emails)} | High Priority: {high_priority_count}")
    print("-" * 80)
