from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.user import UserCreate, UserOut
from app.schemas.token import Token
from app.models.user import UserInDB
from app.db.mongodb import db
from app.auth.hashing import hash_password, verify_password
from app.auth.jwt_handler import create_access_token

router = APIRouter()

@router.post("/signup", response_model=UserOut)
async def signup(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    hashed = hash_password(user.password)
    user_dict = {"email": user.email, "hashed_password": hashed}
    await db.users.insert_one(user_dict)
    return UserOut(email=user.email)

@router.post("/login", response_model=Token)
async def login(user: UserCreate):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}
