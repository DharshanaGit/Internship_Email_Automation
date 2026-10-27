import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from automation_engine.db.db_manager import get_connection

with get_connection() as conn:
    with conn.cursor() as cur:
        # Check current user and privileges
        cur.execute("SELECT current_user, session_user;")
        print("Users:", cur.fetchone())
        
        # Check available schemas
        cur.execute("SELECT schema_name FROM information_schema.schemata;")
        print("Existing schemas:", [r['schema_name'] for r in cur.fetchall()])
        
        # Try creating a dedicated schema
        try:
            cur.execute("CREATE SCHEMA IF NOT EXISTS college_data;")
            print("Successfully created schema 'college_data'!")
        except Exception as e:
            print("CREATE SCHEMA error:", e)
