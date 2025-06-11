from fastapi import Request, HTTPException, Depends
from jose import JWTError, jwt
from app.core.config import settings

SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = "HS256"

async def is_logged_in(request: Request):
    token = request.cookies.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="User not logged in")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        request.state.user = payload  # Store user info in request state
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")