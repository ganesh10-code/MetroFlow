
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def check_tables():
    with engine.connect() as conn:
        print("--- Table Search (ILIKE) ---")
        res = conn.execute(text("SELECT n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname ILIKE 'master_train_data';")).fetchall()
        for r in res:
            print(f"Found: {r[0]}.{r[1]}")
            
        print("\n--- Current Schema Settings ---")
        search_path = conn.execute(text("SHOW search_path;")).scalar()
        print(f"search_path: {search_path}")
        
        current_user = conn.execute(text("SELECT current_user;")).scalar()
        print(f"current_user: {current_user}")

if __name__ == "__main__":
    check_tables()
