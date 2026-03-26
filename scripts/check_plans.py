
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def check_plans():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_name = 'plans';")).scalar()
        print(f"Plans table count: {res}")
        
        if res > 0:
            print("Plans table columns:")
            cols = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'plans';")).fetchall()
            for c in cols:
                print(f"  {c[0]} ({c[1]})")

if __name__ == "__main__":
    check_plans()
