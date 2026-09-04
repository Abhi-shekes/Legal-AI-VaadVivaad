from pydantic import BaseModel, EmailStr

class UserInDB(BaseModel):
    email: EmailStr
    hashed_password: str
