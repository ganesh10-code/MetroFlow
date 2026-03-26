import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
try:
    url = os.getenv("DATABASE_URL")
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    
    print("Deduplicating master_train_data...")
    cur.execute("""
        DELETE FROM master_train_data
        WHERE ctid NOT IN (
            SELECT MIN(ctid)
            FROM master_train_data
            GROUP BY train_id
        );
    """)
    print(f"Deleted {cur.rowcount} duplicate rows.")
    
    print("Adding PRIMARY KEY (train_id) to master_train_data...")
    cur.execute("ALTER TABLE master_train_data ADD PRIMARY KEY (train_id);")
    print("Primary key added successfully.")
    
    # COMMIT PSYCOPG2 TRANSACTION before starting SQLAlchemy tasks
    conn.commit()
    print("Psycopg2 transaction committed.")
    
    # Now run SQLAlchemy to create missing tables
    print("Starting SQLAlchemy create_all...")
    import sys
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    from app.core.database import engine
    from app.models import user, train, plan
    from app.core.database import Base
    
    Base.metadata.create_all(bind=engine)
    print("Final table check complete (SQLAlchemy).")
    
    cur.close()
    conn.close()
    print("ALL DONE!")
except Exception as e:
    if 'conn' in locals():
        conn.rollback()
    print(f"Error: {e}")
