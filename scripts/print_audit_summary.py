import sys
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import psycopg
from psycopg.rows import dict_row
from automation_engine.config import POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD

conn = psycopg.connect(
    host=POSTGRES_HOST, port=POSTGRES_PORT, dbname=POSTGRES_DB,
    user=POSTGRES_USER, password=POSTGRES_PASSWORD,
    options='-c search_path=college_data,public',
    row_factory=dict_row
)
cur = conn.cursor()

cur.execute('SELECT COUNT(*) as c FROM colleges;')
total_cols = cur.fetchone()['c']

cur.execute('SELECT COUNT(*) as c FROM college_contacts;')
total_cts = cur.fetchone()['c']

cur.execute('SELECT COUNT(*) as c FROM college_contacts WHERE dns_mx_verified = TRUE;')
total_mx = cur.fetchone()['c']

cur.execute('''
    SELECT c.state, COUNT(DISTINCT c.id) as cols_with_email, COUNT(ct.id) as email_count
    FROM colleges c
    JOIN college_contacts ct ON c.id = ct.college_id
    WHERE ct.target_email IS NOT NULL AND ct.target_email != ''
    GROUP BY c.state
    ORDER BY cols_with_email DESC;
''')
state_report = cur.fetchall()

print(f"Total Clean Colleges in PostgreSQL: {total_cols:,}")
print(f"Total Verified Contacts in DB:      {total_cts:,}")
print(f"Total DNS MX Confirmed Deliverable: {total_mx:,} ({(total_mx/max(1, total_cts))*100:.1f}%)")
print(f"States / UTs Represented:           {len(state_report)} of 36\n")
print(f"{'State / Union Territory':<44} {'Colleges with Email':<22} {'Total Verified Emails'}")
print("-" * 80)
for r in state_report:
    print(f"{r['state']:<44} {r['cols_with_email']:<22} {r['email_count']}")

conn.close()
