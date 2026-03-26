import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
try:
    url = os.getenv("DATABASE_URL")
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    
    print("Deduplicating master_train_data...")
    # SQL to delete all but the first occurrence of each train_id
    # Using ctid (the physical address of the row) to identify unique rows
    cur.execute("""
        DELETE FROM master_train_data
        WHERE ctid NOT IN (
            SELECT MIN(ctid)
            FROM master_train_data
            GROUP BY train_id
        );
    """)
    deleted_count = cur.rowcount
    print(f"Deleted {deleted_count} duplicate rows.")
    
    # Now add the PRIMARY KEY
    print("Adding PRIMARY KEY (train_id) to master_train_data...")
    cur.execute("ALTER TABLE master_train_data ADD PRIMARY KEY (train_id);")
    print("Primary key added successfully.")
    
    # Run Base.metadata.create_all to create missing tables
    print("Creating missing tables via SQLAlchemy...")
    import sys
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    from app.core.database import engine
    from app.models import user, train, plan
    from app.core.database import Base
    
    Base.metadata.create_all(bind=engine)
    print("All tables created.")
    
    conn.commit()
    cur.close()
    conn.close()
    print("Deduplication and Schema Fix COMPLETE!")
except Exception as e:
    if 'conn' in locals():
        conn.rollback()
    print(f"Error: {e}")
