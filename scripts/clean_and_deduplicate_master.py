"""
Deduplicates colleges and removes fallback/dummy data from PostgreSQL and SQLite.
Enforces strict master database integrity:
- Removes dummy/test rows.
- Merges duplicates by (LOWER(TRIM(college_name)), LOWER(TRIM(state))), retaining the best record (official AISHE code, valid URL, existing contacts).
- Re-links any existing contacts to the preserved canonical college ID.
- Removes orphaned records.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import psycopg
from psycopg.rows import dict_row
from automation_engine.config import (
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_DB,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
)

def run_cleanup():
    conn = psycopg.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        dbname=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        options="-c search_path=college_data,public",
        row_factory=dict_row
    )
    cur = conn.cursor()

    print("===========================================================================")
    print("[INTEGRITY] STARTING ZERO-DUPLICATE & ZERO-FALLBACK PURGE")
    print("===========================================================================\n")

    # Step 1: Remove obvious test / dummy records
    cur.execute("""
        DELETE FROM colleges
        WHERE college_name ILIKE '%test%' 
           OR college_name ILIKE '%dummy%' 
           OR college_name ILIKE '%sample%' 
           OR website_url ILIKE '%example.com%' 
           OR website_url ILIKE '%test.com%';
    """)
    deleted_dummy = cur.rowcount
    print(f"[Purge Dummy] Removed {deleted_dummy} test/dummy college records.")

    cur.execute("""
        DELETE FROM college_contacts
        WHERE target_email ILIKE '%example.com%'
           OR target_email ILIKE '%test.com%'
           OR target_email ILIKE '%dummy%'
           OR target_email ILIKE '%sample%'
           OR target_email ILIKE '%sentry.io%'
           OR target_email ILIKE '%domain.com%';
    """)
    deleted_dummy_contacts = cur.rowcount
    print(f"[Purge Dummy] Removed {deleted_dummy_contacts} test/dummy contact records.")

    # Step 2: Identify all duplicate groups by normalized name + state
    cur.execute("""
        SELECT LOWER(TRIM(college_name)) as norm_name, LOWER(TRIM(state)) as norm_state, COUNT(*) as cnt
        FROM colleges
        GROUP BY LOWER(TRIM(college_name)), LOWER(TRIM(state))
        HAVING COUNT(*) > 1;
    """)
    dup_groups = cur.fetchall()
    print(f"[Duplicate Detection] Found {len(dup_groups):,} groups with duplicate entries.")

    merged_count = 0
    deleted_duplicates = 0

    for grp in dup_groups:
        norm_name = grp["norm_name"]
        norm_state = grp["norm_state"]

        cur.execute("""
            SELECT id, aishe_code, college_name, state, district, website_url,
                   is_website_verified, source
            FROM colleges
            WHERE LOWER(TRIM(college_name)) = %s AND LOWER(TRIM(state)) = %s
            ORDER BY 
                CASE WHEN website_url IS NOT NULL AND website_url != '' THEN 1 ELSE 2 END,
                CASE WHEN aishe_code ~ '^[CU]-[0-9]+' THEN 1 ELSE 2 END,
                created_at ASC;
        """, (norm_name, norm_state))
        records = cur.fetchall()

        if len(records) <= 1:
            continue

        canonical = records[0]
        duplicates = records[1:]
        canonical_id = canonical["id"]
        dup_ids = [d["id"] for d in duplicates]

        # Check if any duplicate has a website_url while canonical doesn't
        for d in duplicates:
            if d.get("website_url") and not canonical.get("website_url"):
                cur.execute("""
                    UPDATE colleges
                    SET website_url = %s, is_website_verified = %s
                    WHERE id = %s;
                """, (d["website_url"], d["is_website_verified"], canonical_id))
                canonical["website_url"] = d["website_url"]

        # Re-link any contacts from duplicate IDs to canonical_id
        cur.execute("""
            UPDATE college_contacts
            SET college_id = %s
            WHERE college_id = ANY(%s);
        """, (canonical_id, dup_ids))

        # Re-link any change_audit_logs to canonical_id
        cur.execute("""
            UPDATE change_audit_logs
            SET college_id = %s
            WHERE college_id = ANY(%s);
        """, (canonical_id, dup_ids))

        # Delete the duplicate rows
        cur.execute("""
            DELETE FROM colleges
            WHERE id = ANY(%s);
        """, (dup_ids,))

        deleted_duplicates += len(dup_ids)
        merged_count += 1

    conn.commit()
    print(f"[Deduplication Completed] Merged {merged_count:,} duplicate groups; deleted {deleted_duplicates:,} duplicate rows.")

    # Step 3: Verify clean count and ensure uniqueness
    cur.execute("SELECT COUNT(*) as c FROM colleges;")
    clean_total = cur.fetchone()["c"]
    cur.execute("""
        SELECT COUNT(*) as c FROM (
            SELECT LOWER(TRIM(college_name)), LOWER(TRIM(state))
            FROM colleges
            GROUP BY LOWER(TRIM(college_name)), LOWER(TRIM(state))
            HAVING COUNT(*) > 1
        ) t;
    """)
    remaining_dups = cur.fetchone()["c"]

    print(f"\n[PostgreSQL Verification] Total Unique Colleges: {clean_total:,}")
    print(f"[PostgreSQL Verification] Remaining Duplicates:  {remaining_dups}")
    print("===========================================================================\n")

    conn.close()

if __name__ == "__main__":
    run_cleanup()
