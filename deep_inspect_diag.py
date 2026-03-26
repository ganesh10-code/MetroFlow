import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
try:
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()
    
    # Get columns
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'master_train_data'
        ORDER BY ordinal_position;
    """)
    columns = cur.fetchall()
    print("Columns in master_train_data:")
    for col in columns:
        print(f"- {col[0]} ({col[1]}), Nullable: {col[2]}")
    
    # Get indices/constraints
    cur.execute("""
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'master_train_data';
    """)
    indices = cur.fetchall()
    print("\nIndices on master_train_data:")
    for idx in indices:
        print(f"- {idx[0]}: {idx[1]}")

    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
