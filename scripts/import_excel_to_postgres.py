import sys
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from automation_engine.db.db_manager import upsert_contacts_bulk, get_connection

def import_all_harvested_contacts():
    excel_path = Path("data") / "Pan_India_Verified_Colleges_Contacts.xlsx"
    if not excel_path.exists():
        print(f"File {excel_path} does not exist.")
        return 0

    df = pd.read_excel(excel_path)
    records = df.to_dict(orient="records")
    print(f"Loading {len(records)} verified records from {excel_path} into PostgreSQL...")

    inserted = upsert_contacts_bulk(records)
    print(f"Successfully upserted {inserted} contacts into PostgreSQL 'college_directory'!")

    # Verify count in database
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) as total, count(CASE WHEN dns_mx_verified THEN 1 END) as mx_count FROM college_contacts;")
            res = cur.fetchone()
            print(f"PostgreSQL Verification: Total Verified Contacts: {res['total']} (DNS MX Active: {res['mx_count']})")
    return inserted

if __name__ == "__main__":
    import_all_harvested_contacts()
