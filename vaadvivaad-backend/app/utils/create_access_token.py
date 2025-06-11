import jwt
import os
from datetime import datetime, timedelta
from app.core.config import settings

# Load your secret key (same as process.env.JWT_KEY in Node.js)
JWT_SECRET = settings.JWT_SECRET_KEY
JWT_ALGORITHM = settings.JWT_ALGORITHM
JWT_EXPIRY_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES # Optional: 1 hour expiry

def create_access_token(data: dict) -> str:
    """
    Generates a JWT token with payload (like {email, role})
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRY_MINUTES)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt
