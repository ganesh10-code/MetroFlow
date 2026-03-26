import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
try:
    url = os.getenv("DATABASE_URL")
    conn = psycopg2.connect(url)
    conn.autocommit = True
    cur = conn.cursor()
    
    # Get current backend PID
    cur.execute("SELECT pg_backend_pid();")
    mypid = cur.fetchone()[0]
    print(f"My PID: {mypid}")
    
    # Try to terminate other sessions for the same user (if we have permission)
    # On Neon, usually you can only see/kill your own sessions
    cur.execute("""
        SELECT pid, state, query
        FROM pg_stat_activity
        WHERE pid <> %s AND usename IS NOT NULL;
    """, (mypid,))
    others = cur.fetchall()
    print(f"Other sessions found: {len(others)}")
    for pid, state, query in others:
        print(f"Killing PID {pid} (State: {state}, Query: {query[:50]})")
        try:
            cur.execute("SELECT pg_terminate_backend(%s);", (pid,))
        except Exception as e:
            print(f"Could not kill {pid}: {e}")
            
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
