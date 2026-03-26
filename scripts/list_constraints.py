
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def list_constraints():
    with engine.connect() as conn:
        print("Listing constraints on master_train_data...")
        res = conn.execute(text("""
            SELECT
                tc.constraint_name, 
                tc.constraint_type,
                kcu.column_name
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
            WHERE tc.table_name = 'master_train_data';
        """)).fetchall()
        for r in res:
            print(f"Constraint: {r[0]}, Type: {r[1]}, Column: {r[2]}")
            
        print("\nListing referencing foreign keys...")
        res = conn.execute(text("""
            SELECT
                tc.table_name, 
                tc.constraint_name,
                kcu.column_name
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'master_train_data' AND ccu.column_name = 'train_id';
        """)).fetchall()
        for r in res:
            print(f"Referencing: {r[0]}.{r[2]} via {r[1]}")

if __name__ == "__main__":
    list_constraints()
