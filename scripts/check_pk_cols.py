
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def check_pk_cols():
    with engine.connect() as conn:
        print("Checking PK columns for master_train_data...")
        res = conn.execute(text("""
            SELECT
                a.attname,
                format_type(a.atttypid, a.atttypmod) AS data_type
            FROM
                pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE
                i.indrelid = 'master_train_data'::regclass
                AND i.indisprimary;
        """)).fetchall()
        for r in res:
            print(f"PK Column: {r[0]} ({r[1]})")

if __name__ == "__main__":
    check_pk_cols()
