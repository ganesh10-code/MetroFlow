
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def deep_pg_check():
    with engine.connect() as conn:
        print("--- pg_index on master_train_data ---")
        res = conn.execute(text("""
            SELECT
                i.relname as index_name,
                idx.indisprimary,
                idx.indisunique,
                pg_get_indexdef(i.oid)
            FROM
                pg_index idx
                JOIN pg_class i ON i.oid = idx.indexrelid
                JOIN pg_class t ON t.oid = idx.indrelid
            WHERE
                t.relname = 'master_train_data';
        """)).fetchall()
        for r in res:
            print(f"Index: {r[0]}, PK: {r[1]}, Unique: {r[2]}, Def: {r[3]}")
            
        print("\n--- pg_constraint (full details) ---")
        res = conn.execute(text("""
            SELECT
                conname,
                contype,
                confrelid::regclass as ref_table,
                pg_get_constraintdef(oid)
            FROM
                pg_constraint
            WHERE
                conrelid = 'master_train_data'::regclass;
        """)).fetchall()
        for r in res:
            print(f"Constraint: {r[0]}, Type: {r[1]}, Ref: {r[2]}, Def: {r[3]}")

if __name__ == "__main__":
    deep_pg_check()
