import sys
import os

# Add backend directory to path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.train import MasterTrainData
from app.core.security import get_password_hash

def seed_db():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    
    print("Checking users...")
    if db.query(User).count() == 0:
        print("Seeding dummy users...")
        users_to_add = [
            {"name": "System Admin", "username": "admin", "role": "ADMIN"},
            {"name": "Lead Planner", "username": "planner", "role": "PLANNER"},
            {"name": "Maintenance Chief", "username": "maintenance", "role": "MAINTENANCE"},
            {"name": "Fitness Inspector", "username": "fitness", "role": "FITNESS"},
            {"name": "Branding Manager", "username": "branding", "role": "BRANDING"}
        ]
        
        for u in users_to_add:
            user = User(
                name=u["name"],
                username=u["username"],
                hashed_password=get_password_hash("password123"),
                role=u["role"],
                is_active=True
            )
            db.add(user)
        db.commit()
        print("Users seeded successfully. Default password is 'password123'.")
    else:
        print("Users already exist.")

    print("Checking train data...")
    if db.query(MasterTrainData).count() == 0:
        print("Seeding dummy trains...")
        for i in range(1, 11):
            train = MasterTrainData(
                train_id=f"T-10{i}",
                rolling_stock_status="UNKNOWN",
                compliance_status="NOT VERIFIED",
                penalty_risk_level="LOW"
            )
            db.add(train)
        db.commit()
        print("Dummy trains seeded successfully.")
    else:
        print("Train data already exists.")
        
    db.close()

if __name__ == "__main__":
    seed_db()
