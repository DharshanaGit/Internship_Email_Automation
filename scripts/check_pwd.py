import sqlite3
import bcrypt

for p in [r'D:\AI INTERN\INTERN EMAIL AUTOMATION\prisma\dev.db', r'C:\Users\Lenovo\OneDrive\Desktop\AI INTERN\INTERN EMAIL AUTOMATION\prisma\dev.db']:
    try:
        conn = sqlite3.connect(p)
        c = conn.cursor()
        c.execute("SELECT email, password FROM User WHERE email='admin@shortfundly.com'")
        row = c.fetchone()
        if row:
            email, pwd_hash = row
            found = False
            for test_pwd in ['Shortfundly@Pass2026!', 'Shortfundly@2026', 'Shortfundly@Pass2026', 'admin123', 'admin']:
                if bcrypt.checkpw(test_pwd.encode(), pwd_hash.encode()):
                    print(f"{p} matches password: '{test_pwd}'")
                    found = True
                    break
            if not found:
                print(f"{p} did not match common passwords. Hash: {pwd_hash}")
    except Exception as e:
        print(f"Error on {p}: {e}")
