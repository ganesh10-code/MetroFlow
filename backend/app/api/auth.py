from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, decode_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

auth_router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


class Token(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    role: str
    is_active: bool


def get_user_by_username(db, username):
    result = db.execute(
        text("SELECT * FROM users WHERE username = :username"),
        {"username": username}
    ).fetchone()
    return result


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    username = payload.get("sub")
    user = get_user_by_username(db, username)

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


def get_current_active_user(user=Depends(get_current_user)):
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")
    return user


@auth_router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = get_user_by_username(db, form_data.username)

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {"access_token": token, "token_type": "bearer"}


@auth_router.get("/me")
def get_me(user=Depends(get_current_active_user)):
    return dict(user._mapping)