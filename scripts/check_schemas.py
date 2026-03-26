
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def check_all_schemas():
    with engine.connect() as conn:
        print("Checking all schemas for master_train_data...")
        res = conn.execute(text("SELECT n.nspname as schema_name, c.relname as table_name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'master_train_data';")).fetchall()
        for r in res:
            print(f"Found: {r[0]}.{r[1]}")
            
        print("\nChecking current search_path...")
        res = conn.execute(text("SHOW search_path;")).scalar()
        print(f"Search path: {res}")

if __name__ == "__main__":
    check_all_schemas()
