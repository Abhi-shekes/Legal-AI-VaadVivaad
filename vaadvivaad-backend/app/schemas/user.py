from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    name : str
    email: EmailStr
    password: str

class LoginUser(BaseModel):
    email:EmailStr
    password:str

class UserOut(BaseModel):
    email: EmailStr
