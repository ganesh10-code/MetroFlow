import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
try:
    url = os.getenv("DATABASE_URL")
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    
    # Check 3 occurrences of 'TS-01'
    cur.execute("""
        SELECT *
        FROM master_train_data
        WHERE train_id = 'TS-01';
    """)
    rows = cur.fetchall()
    
    # Get column names
    colnames = [desc[0] for desc in cur.description]
    
    with open("duplicate_sample.txt", "w") as f:
        f.write(f"Sample duplicates for TS-01 (Total {len(rows)} rows):\n\n")
        for i, row in enumerate(rows):
            f.write(f"Row {i+1}:\n")
            for col, val in zip(colnames, row):
                f.write(f"  - {col}: {val}\n")
            f.write("\n")
            
    cur.close()
    conn.close()
    print("Check complete. Results saved to duplicate_sample.txt")
except Exception as e:
    print(f"Error: {e}")
