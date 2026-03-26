
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def manual_create_full():
    with engine.connect() as conn:
        print("Starting Manual Full Table Creation...")
        try:
            # 1. Create plans table
            print("Creating 'plans' table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS plans (
                    id SERIAL PRIMARY KEY,
                    date DATE NOT NULL,
                    status VARCHAR(20) DEFAULT 'DRAFT',
                    is_locked BOOLEAN DEFAULT FALSE,
                    total_trains INTEGER DEFAULT 0,
                    selected_count INTEGER DEFAULT 0,
                    confidence_score FLOAT DEFAULT 1.0,
                    explanation TEXT
                );
            """))
            print("'plans' table ready.")
            
            # 2. Create plan_details table
            print("Creating 'plan_details' table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS plan_details (
                    id SERIAL PRIMARY KEY,
                    plan_id INTEGER NOT NULL REFERENCES plans(id),
                    train_id TEXT NOT NULL REFERENCES master_train_data(train_id),
                    decision TEXT NOT NULL,
                    risk_score FLOAT DEFAULT 0.0,
                    confidence_band FLOAT DEFAULT 1.0,
                    override_flag BOOLEAN DEFAULT FALSE,
                    remarks TEXT
                );
            """))
            print("'plan_details' table ready.")
            
            conn.commit()
            print("Manual Full Creation SUCCESSFUL!")
        except Exception as e:
            conn.rollback()
            print(f"Manual Full Creation FAILED: {e}")

if __name__ == "__main__":
    manual_create_full()
