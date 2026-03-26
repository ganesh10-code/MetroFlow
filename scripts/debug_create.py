
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def debug_create():
    with engine.connect() as conn:
        print("--- Schema Check ---")
        schema_res = conn.execute(text("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'master_train_data';")).fetchall()
        for r in schema_res:
            print(f"master_train_data schema: {r[0]}")
            
        print("\n--- Manual SQL Creation ---")
        try:
            # We use the exact SQL from the error message
            sql = """
            CREATE TABLE plan_details (
                    id SERIAL NOT NULL,
                    plan_id INTEGER NOT NULL,
                    train_id VARCHAR NOT NULL,
                    decision VARCHAR NOT NULL,
                    risk_score FLOAT,
                    override_flag BOOLEAN,
                    remarks TEXT,
                    overridden_by INTEGER,
                    overridden_at TIMESTAMP WITH TIME ZONE,
                    PRIMARY KEY (id),
                    FOREIGN KEY(plan_id) REFERENCES plans (id),
                    FOREIGN KEY(train_id) REFERENCES master_train_data (train_id),
                    FOREIGN KEY(overridden_by) REFERENCES users (id)
            )
            """
            conn.execute(text("DROP TABLE IF EXISTS plan_details CASCADE;"))
            conn.execute(text(sql))
            print("Manual SQL creation SUCCEEDED!")
            conn.commit()
        except Exception as e:
            print(f"Manual SQL creation FAILED: {e}")

if __name__ == "__main__":
    debug_create()
