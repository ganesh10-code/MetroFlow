
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def pg_inspect():
    with engine.connect() as conn:
        print("--- pg_constraint on master_train_data ---")
        res = conn.execute(text("""
            SELECT conname, contype 
            FROM pg_constraint 
            WHERE conrelid = 'master_train_data'::regclass;
        """)).fetchall()
        for r in res:
            print(f"Constraint: {r[0]}, Type: {r[1]}")
            
        print("\n--- pg_constraint on jobcard_status ---")
        res = conn.execute(text("""
            SELECT conname, contype 
            FROM pg_constraint 
            WHERE conrelid = 'jobcard_status'::regclass;
        """)).fetchall()
        for r in res:
            print(f"Constraint: {r[0]}, Type: {r[1]}")

        print("\n--- Check if train_id column has a unique index ---")
        res = conn.execute(text("""
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'master_train_data' AND indexdef LIKE '%train_id%';
        """)).fetchall()
        for r in res:
            print(f"Index: {r[0]} -> {r[1]}")

if __name__ == "__main__":
    pg_inspect()
