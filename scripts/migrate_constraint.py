import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from automation_engine.db.db_manager import get_connection

with get_connection() as conn:
    with conn.cursor() as cur:
        cur.execute("SET search_path TO college_data, public;")
        # Check existing constraints
        cur.execute("""
            ALTER TABLE college_contacts DROP CONSTRAINT IF EXISTS uq_college_target_email;
            ALTER TABLE college_contacts DROP CONSTRAINT IF EXISTS uq_target_email;
            ALTER TABLE college_contacts ADD CONSTRAINT uq_target_email UNIQUE (target_email);
        """)
        print("Updated college_contacts unique constraint to (target_email) successfully!")
