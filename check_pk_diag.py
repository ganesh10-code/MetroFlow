import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
try:
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()
    cur.execute("""
        SELECT count(*) 
        FROM information_schema.table_constraints 
        WHERE table_name='master_train_data' AND constraint_type='PRIMARY KEY';
    """)
    pk_count = cur.fetchone()[0]
    print(f"Primary key count for master_train_data: {pk_count}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
