
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
    exit(1)

engine = create_engine(DATABASE_URL)

def run_fix():
    with engine.connect() as conn:
        print("Starting Database Schema Fix...")
        
        # 1. Ensure master_train_data has a primary key on train_id
        try:
            print("Ensuring master_train_data.train_id is PRIMARY KEY...")
            # We use text() for raw SQL
            # First check if constraint exists
            res = conn.execute(text("""
                SELECT count(*) 
                FROM information_schema.table_constraints 
                WHERE table_name='master_train_data' AND constraint_type='PRIMARY KEY';
            """)).scalar()
            
            if res == 0:
                print("Adding PRIMARY KEY to master_train_data(train_id)...")
                conn.execute(text("ALTER TABLE master_train_data ADD PRIMARY KEY (train_id);"))
                print("Primary key added.")
            else:
                print("Primary key already exists on master_train_data.")
        except Exception as e:
            print(f"Notice: Could not add PRIMARY KEY (it might already exist or table is empty): {e}")

        # 2. Try to run create_all again to pick up new tables like plan_details
        try:
            print("Attempting to run create_all via SQLAlchemy metadata...")
            # We need to import the models so they are registered on Base
            import sys
            sys.path.append(os.path.join(os.getcwd(), 'backend'))
            from app.core.database import Base
            from app.models import user, train, plan
            
            Base.metadata.create_all(bind=engine)
            print("Tables created successfully (if they didn't exist).")
        except Exception as e:
            print(f"Error during create_all: {e}")
            
        conn.commit()
        print("Fix complete.")

if __name__ == "__main__":
    run_fix()
