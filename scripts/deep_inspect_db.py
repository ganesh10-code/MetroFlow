
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def inspect_db():
    with engine.connect() as conn:
        print("--- Table Check ---")
        tables = conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';")).fetchall()
        for t in tables:
            print(f"Table: {t[0]}")
            
        print("\n--- Constraints for master_train_data ---")
        constraints = conn.execute(text("""
            SELECT conname, contype, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'master_train_data'::regclass;
        """)).fetchall()
        for c in constraints:
            print(f"Constraint: {c[0]} ({c[1]}) -> {c[2]}")
            
        print("\n--- Indexes for master_train_data ---")
        indexes = conn.execute(text("""
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'master_train_data';
        """)).fetchall()
        for i in indexes:
            print(f"Index: {i[0]} -> {i[1]}")

        print("\n--- Columns for master_train_data ---")
        cols = conn.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'master_train_data';
        """)).fetchall()
        for col in cols:
            print(f"Column: {col[0]} ({col[1]}, nullable={col[2]})")

if __name__ == "__main__":
    try:
        inspect_db()
    except Exception as e:
        print(f"Error: {e}")
