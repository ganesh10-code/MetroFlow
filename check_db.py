import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Connect to your postgres DB
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
print("Connection to database successful!")

# Open a cursor to perform database operations
cur = conn.cursor()

# Execute a query
tables = [
    "master_train_data",
    "jobcard_status",
    "fitness_certificates",
    "mileage_balancing",
    "cleaning_detailing",
    "branding_priorities",
    "stabling_geometry"
]

for table in tables:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {table};")
        count = cur.fetchone()[0]
        print(f"Table '{table}' row count: {count}")
    except Exception as e:
        print(f"Table '{table}' error: {e}")
        conn.rollback()

cur.close()
conn.close()
