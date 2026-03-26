
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def check_case():
    with engine.connect() as conn:
        print("Checking exact column names in master_train_data...")
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'master_train_data';")).fetchall()
        for r in res:
            print(f"Column: '{r[0]}'")
            
        print("\nChecking exact table name...")
        res = conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename ILIKE 'master_train_data';")).fetchall()
        for r in res:
            print(f"Table: '{r[0]}'")

if __name__ == "__main__":
    check_case()
