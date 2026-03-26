
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def try_text():
    with engine.connect() as conn:
        print("Creating plan_details with TEXT train_id...")
        try:
            conn.execute(text("DROP TABLE IF EXISTS plan_details CASCADE;"))
            sql = """
            CREATE TABLE plan_details (
                    id SERIAL PRIMARY KEY,
                    plan_id INTEGER NOT NULL,
                    train_id TEXT NOT NULL,
                    decision TEXT NOT NULL,
                    risk_score FLOAT,
                    override_flag BOOLEAN,
                    remarks TEXT,
                    overridden_by INTEGER,
                    overridden_at TIMESTAMP WITH TIME ZONE,
                    FOREIGN KEY(plan_id) REFERENCES plans (id),
                    FOREIGN KEY(train_id) REFERENCES master_train_data (train_id),
                    FOREIGN KEY(overridden_by) REFERENCES users (id)
            )
            """
            conn.execute(text(sql))
            print("Table created successfully!")
            conn.commit()
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    try_text()
