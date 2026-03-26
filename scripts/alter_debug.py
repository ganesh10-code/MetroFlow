
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def alter_debug():
    with engine.connect() as conn:
        print("Creating plan_details without FK...")
        try:
            conn.execute(text("DROP TABLE IF EXISTS plan_details CASCADE;"))
            conn.execute(text("""
                CREATE TABLE plan_details (
                    id SERIAL PRIMARY KEY,
                    plan_id INTEGER NOT NULL,
                    train_id VARCHAR NOT NULL,
                    decision VARCHAR NOT NULL,
                    risk_score FLOAT,
                    override_flag BOOLEAN,
                    remarks TEXT,
                    overridden_by INTEGER,
                    overridden_at TIMESTAMP WITH TIME ZONE
                )
            """))
            print("Table created.")
            
            print("\nAdding FK plan_id...")
            conn.execute(text("ALTER TABLE plan_details ADD CONSTRAINT fk_plan FOREIGN KEY (plan_id) REFERENCES plans(id);"))
            print("FK plan_id added.")
            
            print("\nAdding FK overridden_by...")
            conn.execute(text("ALTER TABLE plan_details ADD CONSTRAINT fk_user FOREIGN KEY (overridden_by) REFERENCES users(id);"))
            print("FK overridden_by added.")
            
            print("\nAdding FK train_id (the problematic one)...")
            conn.execute(text("ALTER TABLE plan_details ADD CONSTRAINT fk_train FOREIGN KEY (train_id) REFERENCES master_train_data(train_id);"))
            print("FK train_id added successfully!")
            
            conn.commit()
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    alter_debug()
