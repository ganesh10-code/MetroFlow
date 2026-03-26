import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
try:
    url = os.getenv("DATABASE_URL")
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    
    with open("referencing_tables_inspect.txt", "w") as f:
        tables = ['jobcard_status', 'fitness_certificates', 'branding_priorities']
        for table in tables:
            f.write(f"\nINSPECTING {table}\n")
            f.write("="*30 + "\n")
            
            # Get FKs
            cur.execute(f"""
                SELECT
                    conname AS constraint_name,
                    pg_get_constraintdef(c.oid) AS constraint_definition
                FROM
                    pg_constraint c
                JOIN
                    pg_class t ON c.conrelid = t.oid
                WHERE
                    t.relname = '{table}'
                    AND c.contype = 'f';
            """)
            fks = cur.fetchall()
            f.write("Foreign Keys:\n")
            for fk in fks:
                f.write(f"- {fk[0]}: {fk[1]}\n")
            
    cur.close()
    conn.close()
    print("Inspection complete. Results saved to referencing_tables_inspect.txt")
except Exception as e:
    print(f"Error: {e}")
