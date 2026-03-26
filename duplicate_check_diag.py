import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
try:
    url = os.getenv("DATABASE_URL")
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    
    # Check for duplicates
    cur.execute("""
        SELECT train_id, COUNT(*)
        FROM master_train_data
        GROUP BY train_id
        HAVING COUNT(*) > 1;
    """)
    duplicates = cur.fetchall()
    
    with open("duplicate_check.txt", "w") as f:
        if duplicates:
            f.write("DUPLICATES FOUND in master_train_data.train_id:\n")
            for dup in duplicates:
                f.write(f"- {dup[0]}: {dup[1]} occurrences\n")
        else:
            f.write("No duplicates found in master_train_data.train_id.\n")
            
    cur.close()
    conn.close()
    print("Check complete. Results saved to duplicate_check.txt")
except Exception as e:
    print(f"Error: {e}")
