import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
try:
    url = os.getenv("DATABASE_URL")
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    
    with open("detailed_db_inspect.txt", "w") as f:
        f.write(f"Connecting to: {url[:15]}...\n\n")
        
        # Get list of all tables
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        tables = cur.fetchall()
        f.write("Tables in database:\n")
        for table in tables:
            f.write(f"- {table[0]}\n")
        
        f.write("\n" + "="*50 + "\n")
        f.write("INSPECTING master_train_data\n")
        f.write("="*50 + "\n")
        
        # Get columns
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'master_train_data'
            ORDER BY ordinal_position;
        """)
        columns = cur.fetchall()
        f.write("Columns:\n")
        for col in columns:
            f.write(f"- {col[0]} ({col[1]}), Nullable: {col[2]}\n")
        
        # Get indices/constraints
        cur.execute("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'master_train_data';
        """)
        indices = cur.fetchall()
        f.write("\nIndices:\n")
        for idx in indices:
            f.write(f"- {idx[0]}: {idx[1]}\n")

        # Get primary keys explicitly
        cur.execute("""
            SELECT
                conname AS constraint_name,
                pg_get_constraintdef(c.oid) AS constraint_definition
            FROM
                pg_constraint c
            JOIN
                pg_class t ON c.conrelid = t.oid
            WHERE
                t.relname = 'master_train_data'
                AND c.contype = 'p';
        """)
        pks = cur.fetchall()
        f.write("\nPrimary Keys:\n")
        for pk in pks:
            f.write(f"- {pk[0]}: {pk[1]}\n")

    cur.close()
    conn.close()
    print("Inspection complete. Results saved to detailed_db_inspect.txt")
except Exception as e:
    print(f"Error: {e}")
