
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def low_level_inspect():
    with engine.connect() as conn:
        print("--- pg_attribute on master_train_data ---")
        try:
            res = conn.execute(text("""
                SELECT
                    a.attname AS column_name,
                    format_type(a.atttypid, a.atttypmod) AS data_type,
                    a.attnotnull AS not_null,
                    coalesce(i.indisprimary, false) AS is_primary,
                    coalesce(i.indisunique, false) AS is_unique
                FROM
                    pg_attribute a
                    LEFT JOIN pg_index i ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                WHERE
                    a.attrelid = 'master_train_data'::regclass
                    AND a.attnum > 0
                    AND NOT a.attisdropped;
            """)).fetchall()
            for r in res:
                print(f"Col: '{r[0]}', Type: {r[1]}, PK: {r[3]}, Unique: {r[4]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    low_level_inspect()
