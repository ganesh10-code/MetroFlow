
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def check_collation():
    with engine.connect() as conn:
        print("Checking collations for train_id...")
        res = conn.execute(text("""
            SELECT 
                column_name, 
                collation_name 
            FROM 
                information_schema.columns 
            WHERE 
                table_name = 'master_train_data' AND column_name = 'train_id';
        """)).fetchall()
        for r in res:
            print(f"Table 'master_train_data' Column '{r[0]}' Collation: {r[1]}")

        # Also check DATABASE default collation
        res = conn.execute(text("SELECT datcollate FROM pg_database WHERE datname = current_database();")).scalar()
        print(f"Database collation: {res}")

if __name__ == "__main__":
    check_collation()
