from fastapi import APIRouter, HTTPException, Response, Request
from pydantic import BaseModel
from app.schemas.user import UserCreate, LoginUser
from app.db.mongodb import db
from app.db.mongodb import db
from app.auth.hashing import hash_password, verify_password
from app.utils.create_access_token import create_access_token

router = APIRouter()

class SuccessMessage(BaseModel):
    status: str
    message: str

    

@router.post("/signup", response_model=SuccessMessage)
async def signup(user: UserCreate, response: Response):
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        return {"status": "fail", "message": "User Already Exist"}
    

    hashed_pwd = hash_password(user.password)
    new_user = {"name" : user.name , "email": user.email, "hashed_password": hashed_pwd}
    await db.users.insert_one(new_user)

    return {"status": "success", "message": "User Created successfully"}

@router.post("/login")
async def login(user: LoginUser, response: Response , response_model=SuccessMessage):
    db_user = await db.users.find_one({"email": user.email})
    
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        return {"status": "fail", "message": "Invalid Credentials"}
    
    token = create_access_token({"email": user.email , "role": "user"})
    
    # Set token in HTTP-only cookie
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="Lax",
        max_age=3600,  # Optional: 1 hour
        path="/"
    )
    
    return {"status": "success", "message": "User logged in successfully"}

@router.post("/logout", response_model=SuccessMessage)
async def logout(request: Request, response: Response):
   
    # Clear the token cookie
    response.delete_cookie(
        key="token",
        path="/"
    )
    
    return {"status": "success", "message": "Successfully logged out"}