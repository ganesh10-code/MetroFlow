
import os
import json
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def recreate_and_restore():
    with engine.connect() as conn:
        print("Starting Recreate and Restore...")
        try:
            # 1. Drop tables
            print("Dropping tables (CASCADE)...")
            conn.execute(text("DROP TABLE IF EXISTS plan_details CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS master_train_data CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS plans CASCADE;"))
            
            # 2. Recreate via Base.metadata
            print("Running create_all...")
            import sys
            sys.path.append(os.path.join(os.getcwd(), 'backend'))
            from app.core.database import Base
            from app.models import user, train, plan
            Base.metadata.create_all(bind=engine)
            
            # 3. Restore data
            print("Restoring data from backup...")
            with open('d:/MetroFlow/scripts/master_train_data_backup.json', 'r') as f:
                data = json.load(f)
            
            if len(data) > 0:
                # Use SQL to insert row by row or bulk
                # We need to handle the column names correctly and dates
                for row in data:
                    keys = row.keys()
                    columns = ", ".join(keys)
                    placeholders = ", ".join([f":{k}" for k in keys])
                    sql = f"INSERT INTO master_train_data ({columns}) VALUES ({placeholders})"
                    conn.execute(text(sql), row)
                print(f"Restored {len(data)} rows.")
            
            conn.commit()
            print("Recreate and Restore SUCCESSFUL!")
        except Exception as e:
            conn.rollback()
            print(f"Recreate and Restore FAILED: {e}")

if __name__ == "__main__":
    recreate_and_restore()
