import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from automation_engine.db.db_manager import get_contacts_by_state

for state in ['Assam', 'Andhra Pradesh', 'All India']:
    contacts = get_contacts_by_state(state, limit=5)
    print(f"\n=== Query PostgreSQL for State: '{state}' ({len(contacts)} returned) ===")
    for c in contacts:
        print(f"  [{c['role']}] {c['target_email']} | {c['college_name']} | {c['district_location']} | Phone: {c['phone']}")
