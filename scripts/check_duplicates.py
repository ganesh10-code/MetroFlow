
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def check_duplicates():
    with engine.connect() as conn:
        print("Checking for duplicate train_ids in master_train_data...")
        try:
            res = conn.execute(text("""
                SELECT train_id, COUNT(*) 
                FROM master_train_data 
                GROUP BY train_id 
                HAVING COUNT(*) > 1;
            """)).fetchall()
            
            if len(res) > 0:
                print(f"Found {len(res)} duplicates!")
                for r in res:
                    print(f"  train_id: {r[0]}, count: {r[1]}")
            else:
                print("No duplicate train_ids found.")
                
            # Also check table structure again
            print("\nTable description:")
            cols = conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'master_train_data';
            """)).fetchall()
            for c in cols:
                print(f"  {c[0]} ({c[1]})")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    check_duplicates()
