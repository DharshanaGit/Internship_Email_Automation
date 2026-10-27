import psycopg

passwords_to_try = [
    'MySecurePass123!',
    'MySecurePass123!"'
]

for pwd in passwords_to_try:
    try:
        with psycopg.connect(
            host="127.0.0.1",
            port=5432,
            dbname="college_directory",
            user="college_bot",
            password=pwd,
            connect_timeout=3
        ) as conn:
            print(f"SUCCESS! Connected to PostgreSQL with password: {repr(pwd)}")
            with conn.cursor() as cur:
                cur.execute("SELECT current_database(), current_user, version();")
                db_info = cur.fetchone()
                print("Connected info:", db_info)
            break
    except Exception as e:
        print(f"Attempt with {repr(pwd)} failed: {e}")
