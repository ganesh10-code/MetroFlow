
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def extreme_fix():
    with engine.connect() as conn:
        print("Starting Extreme Constraint Reset...")
        try:
            # 1. Drop referencing FKs
            print("Dropping referencing FKs from jobcard_status...")
            conn.execute(text("ALTER TABLE jobcard_status DROP CONSTRAINT IF EXISTS jobcard_status_train_id_fkey;"))
            
            # 2. Drop the PK on master_train_data
            print("Dropping PK on master_train_data...")
            conn.execute(text("ALTER TABLE master_train_data DROP CONSTRAINT IF EXISTS master_train_data_pkey CASCADE;"))
            
            # 3. Re-add the PK on master_train_data
            print("Re-adding PK on master_train_data(train_id)...")
            conn.execute(text("ALTER TABLE master_train_data ADD PRIMARY KEY (train_id);"))
            
            # 4. Re-add the FK on jobcard_status
            print("Re-adding FK on jobcard_status...")
            conn.execute(text("ALTER TABLE jobcard_status ADD CONSTRAINT jobcard_status_train_id_fkey FOREIGN KEY (train_id) REFERENCES master_train_data(train_id);"))
            
            # 5. Try to run create_all
            print("Triggering create_all for plan_details...")
            import sys
            sys.path.append(os.path.join(os.getcwd(), 'backend'))
            from app.core.database import Base
            from app.models import user, train, plan
            Base.metadata.create_all(bind=engine)
            
            conn.commit()
            print("Extreme Fix SUCCESSFUL!")
        except Exception as e:
            conn.rollback()
            print(f"Extreme Fix FAILED: {e}")

if __name__ == "__main__":
    extreme_fix()
