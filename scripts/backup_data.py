
import os
import json
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def backup_data():
    with engine.connect() as conn:
        print("Backing up master_train_data...")
        res = conn.execute(text("SELECT * FROM master_train_data;")).fetchall()
        
        # Get column names
        cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'master_train_data';")).fetchall()
        col_names = [c[0] for c in cols]
        
        data = []
        for r in res:
            # Handle date objects for JSON
            row = {}
            for i, val in enumerate(r):
                if hasattr(val, 'isoformat'):
                    row[col_names[i]] = val.isoformat()
                else:
                    row[col_names[i]] = val
            data.append(row)
            
        with open('d:/MetroFlow/scripts/master_train_data_backup.json', 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Backup saved to master_train_data_backup.json ({len(data)} rows).")

if __name__ == "__main__":
    backup_data()
