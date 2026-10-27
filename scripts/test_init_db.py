import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from automation_engine.db.db_manager import init_db, get_connection

try:
    print("Initializing PostgreSQL tables...")
    init_db()
    
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = [row['table_name'] for row in cur.fetchall()]
            print("Successfully verified tables in database 'college_directory':", tables)
            
            cur.execute("SELECT count(*) as count FROM states;")
            state_count = cur.fetchone()['count']
            print(f"Total States & UTs seeded in PostgreSQL: {state_count}")
except Exception as e:
    print("Error during init_db:", e)
