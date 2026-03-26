
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def enforce_pk():
    with engine.connect() as conn:
        print("Enforcing PRIMARY KEY on master_train_data(train_id)...")
        try:
            # Drop current constraint if any (just in case)
            conn.execute(text("ALTER TABLE master_train_data DROP CONSTRAINT IF EXISTS master_train_data_pkey;"))
            
            # Add PK
            conn.execute(text("ALTER TABLE master_train_data ADD PRIMARY KEY (train_id);"))
            print("PRIMARY KEY added successfully.")
            
            # Check if it worked
            res = conn.execute(text("""
                SELECT conname 
                FROM pg_constraint 
                WHERE conrelid = 'master_train_data'::regclass AND contype = 'p';
            """)).fetchall()
            if len(res) > 0:
                print(f"Verified: PK '{res[0][0]}' exists.")
            else:
                print("Failed to verify PK!")
                
            conn.commit()
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    enforce_pk()
