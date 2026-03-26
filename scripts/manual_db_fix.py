
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def run_fix():
    with engine.connect() as conn:
        print("Starting Manual Constraint Fix...")
        try:
            # 1. Ensure master_train_data exists and has a unique constraint on train_id
            print("Forcing UNIQUE constraint on master_train_data(train_id)...")
            # We use a subtransaction or just commit effectively
            conn.execute(text("ALTER TABLE master_train_data ADD CONSTRAINT master_train_data_train_id_key UNIQUE (train_id);"))
            print("Unique constraint added.")
        except Exception as e:
            print(f"Notice: Could not add UNIQUE constraint (it might already exist): {e}")

        try:
            # 2. Try to create the other tables
            print("Triggering create_all...")
            import sys
            sys.path.append(os.path.join(os.getcwd(), 'backend'))
            from app.core.database import Base
            from app.models import user, train, plan
            Base.metadata.create_all(bind=engine)
            print("create_all completed.")
        except Exception as e:
            print(f"Error during create_all: {e}")
            
        conn.commit()
        print("Manual Fix complete.")

if __name__ == "__main__":
    run_fix()
