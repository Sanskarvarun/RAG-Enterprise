from datetime import datetime, timedelta
from typing import Optional, Union, Any
from jose import jwt
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

load_dotenv()

# Password hashing
# Use bcrypt_sha256 as the preferred scheme so very long passwords
# (longer than bcrypt's 72-byte limit) are supported safely.
pwd_context = CryptContext(
    schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")

# JWT configurations
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        # Handle legacy bcrypt hashes: bcrypt has a 72-byte input limit and
        # the underlying C implementation may raise ValueError when given
        # longer inputs. In that case, if the stored hash is bcrypt we
        # attempt verification against the first 72 bytes of the UTF-8
        # encoded password (decoded safely) to preserve compatibility.
        try:
            scheme = pwd_context.identify(hashed_password)
        except Exception:
            scheme = None
        if scheme == "bcrypt" and plain_password:
            try:
                truncated_pw = plain_password.encode(
                    "utf-8")[:72].decode("utf-8", "ignore")
                return pwd_context.verify(truncated_pw, hashed_password)
            except Exception:
                return False
        return False


def get_password_hash(password: str) -> str:
    # Prefer bcrypt_sha256 to support arbitrary-length passwords. If that
    # scheme isn't available for some reason, fall back to bcrypt and as
    # a last resort truncate to 72 bytes to avoid exceptions.
    try:
        return pwd_context.hash(password, scheme="bcrypt_sha256")
    except Exception:
        try:
            return pwd_context.hash(password, scheme="bcrypt")
        except Exception:
            truncated_pw = password.encode(
                "utf-8")[:72].decode("utf-8", "ignore")
            return pwd_context.hash(truncated_pw, scheme="bcrypt")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None
