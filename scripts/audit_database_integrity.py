import sys
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

# 1. Total colleges
cur.execute('SELECT COUNT(*) as c FROM colleges;')
print('Total colleges in PostgreSQL:', cur.fetchone()['c'])

# 2. Check for duplicate names within same state
cur.execute('''
    SELECT LOWER(TRIM(college_name)) as c_name, LOWER(TRIM(state)) as s_name, COUNT(*) as cnt
    FROM colleges
    GROUP BY LOWER(TRIM(college_name)), LOWER(TRIM(state))
    HAVING COUNT(*) > 1;
''')
dups = cur.fetchall()
print(f'Duplicate colleges count (by name + state): {len(dups)}')

# 3. Check for any fallback / dummy data in colleges or contacts
cur.execute('''
    SELECT COUNT(*) as c FROM colleges
    WHERE college_name ILIKE '%test%' 
       OR college_name ILIKE '%sample%' 
       OR college_name ILIKE '%dummy%'
       OR website_url ILIKE '%example.com%'
       OR website_url ILIKE '%test.com%';
''')
print('Colleges with dummy/test patterns:', cur.fetchone()['c'])

cur.execute('''
    SELECT COUNT(*) as c FROM college_contacts
    WHERE target_email ILIKE '%example.com%'
       OR target_email ILIKE '%test.com%'
       OR target_email ILIKE '%dummy%'
       OR target_email ILIKE '%sample%'
       OR target_email ILIKE '%sentry.io%'
       OR target_email ILIKE '%domain.com%';
''')
print('Contacts with dummy/test patterns:', cur.fetchone()['c'])

# 4. Check contacts and emails per state
cur.execute('''
    SELECT c.state, COUNT(DISTINCT c.id) as cols_with_email, COUNT(ct.id) as total_emails
    FROM colleges c
    JOIN college_contacts ct ON c.id = ct.college_id
    GROUP BY c.state
    ORDER BY total_emails DESC;
''')
print('\nContacts by state in PostgreSQL:')
for r in cur.fetchall():
    print(f"  {r['state']}: {r['cols_with_email']} colleges with email, {r['total_emails']} total contacts")

# 5. Check SQLite outreach.db as well
import sqlite3
sq_conn = sqlite3.connect('data/outreach.db')
sq_cur = sq_conn.cursor()
sq_cur.execute('SELECT COUNT(*) FROM colleges;')
print('\nTotal in SQLite colleges table:', sq_cur.fetchone()[0])
sq_cur.execute('SELECT COUNT(*) FROM college_contacts;')
print('Total in SQLite college_contacts table:', sq_cur.fetchone()[0])

conn.close()
sq_conn.close()
