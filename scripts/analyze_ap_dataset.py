import openpyxl
from collections import defaultdict, Counter
from urllib.parse import urlparse
import re

wb = openpyxl.load_workbook('ANDHRA_PRADESH_VERIFIEDCOLLEGES (1).xlsx', data_only=True)
sheet = wb.active
rows = list(sheet.iter_rows(values_only=True))[1:]

print(f"Total rows in dataset: {len(rows)}")

# 1. Duplicate email analysis
email_map = defaultdict(list)
for i, r in enumerate(rows, 1):
    em = (r[6] or '').strip().lower()
    if em:
        email_map[em].append((i, r[3], r[4]))

dup_emails = {k: v for k, v in email_map.items() if len(v) > 1}
total_dup_email_rows = sum(len(v) for v in dup_emails.values())
print(f"Duplicate Email Groups: {len(dup_emails)} affecting {total_dup_email_rows} rows")
for em, list_inst in list(dup_emails.items())[:10]:
    print(f"  {em} -> {len(list_inst)} records: {[x[1] for x in list_inst]}")

# 2. Duplicate College Name analysis
name_map = defaultdict(list)
for i, r in enumerate(rows, 1):
    nm = (r[3] or '').strip().lower()
    if nm:
        name_map[nm].append((i, r[2], r[4], r[6]))

dup_names = {k: v for k, v in name_map.items() if len(v) > 1}
total_dup_name_rows = sum(len(v) for v in dup_names.values())
print(f"\nDuplicate College Name Groups: {len(dup_names)} affecting {total_dup_name_rows} rows")
for nm, list_inst in list(dup_names.items())[:10]:
    print(f"  '{nm}' -> {len(list_inst)} records: {[(x[1], x[2]) for x in list_inst]}")

# 3. Duplicate Website Domain analysis
def get_domain(u):
    if not u: return ''
    try:
        p = urlparse(u if '://' in u else 'http://' + u)
        return p.netloc.lower().replace('www.', '')
    except:
        return ''

domain_map = defaultdict(list)
for i, r in enumerate(rows, 1):
    d = get_domain(r[4])
    if d and '.' in d:
        domain_map[d].append((i, r[3]))

dup_domains = {k: v for k, v in domain_map.items() if len(v) > 1}
total_dup_domain_rows = sum(len(v) for v in dup_domains.values())
print(f"\nDuplicate Website Domain Groups: {len(dup_domains)} affecting {total_dup_domain_rows} rows")
for dom, list_inst in list(dup_domains.items())[:10]:
    print(f"  {dom} -> {len(list_inst)} records: {[x[1] for x in list_inst][:3]}")

# 4. University vs Affiliated College Classification
univ_keywords = [
    'university', 'vishwavidyalaya', 'iit ', 'nit ', 'iiit ', 'iim ', 'aiims',
    'bits pilani', 'gitam', 'kl university', 'vignan', 'sri venkateswara university',
    'andhra university', 'jntu', 'acharya nagarjuna university', 'sri padmavati',
    'dravidian', 'dr. b.r. ambedkar university', 'rayalaseema university', 'yogi vemana',
    'krishna university', 'adikavi nannaya', 'central university', 'deemed'
]

universities = []
colleges = []

for i, r in enumerate(rows, 1):
    name = (r[3] or '').strip()
    remarks = (r[10] or '').strip()
    name_lower = name.lower()
    remarks_lower = remarks.lower()
    
    is_univ = False
    # Check if remarks designate a university directly (not just affiliated to one)
    if 'state university' in remarks_lower or 'central university' in remarks_lower or 'private university' in remarks_lower or 'deemed' in remarks_lower or 'central autonomous / ini' in remarks_lower:
        is_univ = True
    elif ('university' in name_lower or any(k in name_lower for k in ['iit ', 'nit ', 'iiit ', 'aiims', 'gitam', 'vignan'])) and not any(aff in name_lower for aff in ['college', 'affiliated', 'constituent college', 'campus college']):
        is_univ = True
    elif name_lower.startswith('andhra university') or name_lower.startswith('acharya nagarjuna university') or name_lower.startswith('sri venkateswara university') or name_lower.startswith('jntuk') or name_lower.startswith('jntua') or name_lower.startswith('yogi vemana university'):
        if 'college of' not in name_lower and 'engineering' not in name_lower:
            is_univ = True
            
    if is_univ:
        universities.append((i, name, r[4], remarks))
    else:
        colleges.append((i, name, r[4], remarks))

print(f"\nClassification:")
print(f"  Universities / INIs: {len(universities)}")
print(f"  Autonomous & Affiliated Colleges: {len(colleges)}")
