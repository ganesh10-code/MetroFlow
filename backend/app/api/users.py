from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List

from app.core.database import get_db
from app.core.security import get_password_hash
from app.api.auth import get_current_active_user

users_router = APIRouter()


class UserCreate(BaseModel):
    name: str
    username: str
    password: str
    role: str


class UserUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None


def check_admin(user=Depends(get_current_active_user)):
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not allowed")
    return user


@users_router.get("/")
def get_users(db: Session = Depends(get_db), admin=Depends(check_admin)):
    result = db.execute(text("SELECT * FROM users")).fetchall()
    return [dict(row._mapping) for row in result]


@users_router.post("/")
def create_user(user: UserCreate, db: Session = Depends(get_db), admin=Depends(check_admin)):
    existing = db.execute(
        text("SELECT * FROM users WHERE username = :username"),
        {"username": user.username}
    ).fetchone()

    if existing:
        raise HTTPException(status_code=400, detail="User exists")

    db.execute(text("""
        INSERT INTO users (name, username, hashed_password, role)
        VALUES (:name, :username, :password, :role)
    """), {
        "name": user.name,
        "username": user.username,
        "password": get_password_hash(user.password),
        "role": user.role
    })

    db.commit()
    return {"message": "User created"}