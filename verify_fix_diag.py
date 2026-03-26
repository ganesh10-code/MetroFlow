import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
try:
    url = os.getenv("DATABASE_URL")
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    
    # Check count
    cur.execute("SELECT COUNT(*) FROM master_train_data;")
    count = cur.fetchone()[0]
    print(f"Row count in master_train_data: {count}")
    
    # Check PK
    cur.execute("""
        SELECT count(*) 
        FROM information_schema.table_constraints 
        WHERE table_name='master_train_data' AND constraint_type='PRIMARY KEY';
    """)
    pk_count = cur.fetchone()[0]
    print(f"Primary key count: {pk_count}")
    
    # Check if plans table exists
    cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'plans');")
    plans_exists = cur.fetchone()[0]
    print(f"Table 'plans' exists: {plans_exists}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
