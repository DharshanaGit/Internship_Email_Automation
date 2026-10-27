"""
Fast High-Throughput Zero-Duplicate & Zero-Fallback Purge.
Uses atomic PostgreSQL window functions to merge duplicates and delete invalid rows in seconds.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Line buffering for real-time output
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

import psycopg
from automation_engine.config import (
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_DB,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
)

def run():
    print("\n" + "="*75)
    print("[INTEGRITY] FAST ATOMIC MASTER DEDUPLICATION & FALLBACK PURGE")
    print("="*75 + "\n")

    conn = psycopg.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        dbname=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        options="-c search_path=college_data,public"
    )
    cur = conn.cursor()

    # 1. Purge dummy/test rows from colleges and contacts
    cur.execute("""
        DELETE FROM colleges
        WHERE college_name ILIKE '%test%' 
           OR college_name ILIKE '%dummy%' 
           OR college_name ILIKE '%sample%' 
           OR website_url ILIKE '%example.com%' 
           OR website_url ILIKE '%test.com%';
    """)
    dummy_cols = cur.rowcount
    print(f"[Purge] Deleted {dummy_cols} dummy/test colleges.")

    cur.execute("""
        DELETE FROM college_contacts
        WHERE target_email ILIKE '%example.com%'
           OR target_email ILIKE '%test.com%'
           OR target_email ILIKE '%dummy%'
           OR target_email ILIKE '%sample%'
           OR target_email ILIKE '%sentry.io%'
           OR target_email ILIKE '%domain.com%';
    """)
    dummy_cts = cur.rowcount
    print(f"[Purge] Deleted {dummy_cts} dummy/test contacts.")

    # 2. Re-link any contacts attached to duplicate IDs to the canonical ID
    print("[Deduplication] Re-linking contacts from duplicate IDs to canonical IDs...")
    cur.execute("""
        WITH ranked AS (
            SELECT id,
                   LOWER(TRIM(college_name)) as n_name,
                   LOWER(TRIM(state)) as n_state,
                   FIRST_VALUE(id) OVER (
                       PARTITION BY LOWER(TRIM(college_name)), LOWER(TRIM(state))
                       ORDER BY 
                           CASE WHEN website_url IS NOT NULL AND website_url != '' THEN 1 ELSE 2 END,
                           CASE WHEN aishe_code ~ '^[CU]-[0-9]+' THEN 1 ELSE 2 END,
                           created_at ASC
                   ) as canonical_id,
                   ROW_NUMBER() OVER (
                       PARTITION BY LOWER(TRIM(college_name)), LOWER(TRIM(state))
                       ORDER BY 
                           CASE WHEN website_url IS NOT NULL AND website_url != '' THEN 1 ELSE 2 END,
                           CASE WHEN aishe_code ~ '^[CU]-[0-9]+' THEN 1 ELSE 2 END,
                           created_at ASC
                   ) as rn
            FROM colleges
        )
        UPDATE college_contacts ct
        SET college_id = r.canonical_id
        FROM ranked r
        WHERE ct.college_id = r.id AND r.rn > 1;
    """)
    relinked = cur.rowcount
    print(f"[Deduplication] Re-linked {relinked} contacts to canonical colleges.")

    # 3. Delete duplicates in a single atomic SQL statement
    print("[Deduplication] Deleting secondary duplicate records...")
    cur.execute("""
        WITH ranked AS (
            SELECT id,
                   ROW_NUMBER() OVER (
                       PARTITION BY LOWER(TRIM(college_name)), LOWER(TRIM(state))
                       ORDER BY 
                           CASE WHEN website_url IS NOT NULL AND website_url != '' THEN 1 ELSE 2 END,
                           CASE WHEN aishe_code ~ '^[CU]-[0-9]+' THEN 1 ELSE 2 END,
                           created_at ASC
                   ) as rn
            FROM colleges
        )
        DELETE FROM colleges
        WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
    """)
    deleted_dups = cur.rowcount
    print(f"[Deduplication] Deleted {deleted_dups:,} duplicate college records.")

    conn.commit()

    # 4. Verification
    cur.execute("SELECT COUNT(*) FROM colleges;")
    total_colleges = cur.fetchone()[0]

    cur.execute("""
        SELECT COUNT(*) FROM (
            SELECT LOWER(TRIM(college_name)), LOWER(TRIM(state))
            FROM colleges
            GROUP BY LOWER(TRIM(college_name)), LOWER(TRIM(state))
            HAVING COUNT(*) > 1
        ) t;
    """)
    rem_dups = cur.fetchone()[0]

    print("\n" + "="*75)
    print(f"[VERIFIED] Clean Master Colleges in PostgreSQL: {total_colleges:,}")
    print(f"[VERIFIED] Remaining Duplicates:               {rem_dups}")
    print("="*75 + "\n")

    conn.close()

if __name__ == "__main__":
    run()
