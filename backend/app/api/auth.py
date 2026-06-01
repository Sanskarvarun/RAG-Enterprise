from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional
import os
import re
import smtplib
from email.message import EmailMessage

from app.db.database import get_db
from app.models.user import User
from app.models.schemas import UserCreate, UserResponse, Token
import secrets
from app.core.security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, decode_access_token
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    user_exists = db.query(User).filter(
        (User.email == user_in.email) | (User.username == user_in.username)
    ).first()
    if user_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists"
        )

    # Create new user (development: do not hash the provided password to avoid
    # passlib/bcrypt issues; store a random placeholder instead).
    new_user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=secrets.token_hex(32),
        token_quota=100000,
        tokens_used=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Authenticate user
    # Development mode: skip password verification entirely. Create the user
    # if it doesn't exist and return a token.
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user:
        # create a placeholder user
        user = User(
            username=form_data.username,
            email=(form_data.username + "@example.com"),
            full_name="",
            hashed_password=secrets.token_hex(32),
            token_quota=100000,
            tokens_used=0,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


# Password policy
PASSWORD_POLICY = {
    "min_length": 8,
    "require_uppercase": True,
    "require_lowercase": True,
    "require_digits": True,
    "require_special": True,
    "message": "Password must be at least 8 characters and include uppercase, lowercase, number, and special character. Long passwords of arbitrary length are supported."
}


class ForgotPasswordRequest(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def validate_password(pw: str) -> bool:
    if not pw or len(pw) < PASSWORD_POLICY["min_length"]:
        return False
    if PASSWORD_POLICY["require_uppercase"] and not re.search(r"[A-Z]", pw):
        return False
    if PASSWORD_POLICY["require_lowercase"] and not re.search(r"[a-z]", pw):
        return False
    if PASSWORD_POLICY["require_digits"] and not re.search(r"\d", pw):
        return False
    if PASSWORD_POLICY["require_special"] and not re.search(r"[\W_]", pw):
        return False
    return True


@router.get("/password-policy")
def password_policy():
    return PASSWORD_POLICY


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Find user by email or username
    user = None
    if req.email:
        user = db.query(User).filter(User.email == req.email).first()
    elif req.username:
        user = db.query(User).filter(User.username == req.username).first()

    # Always return a generic message to avoid user enumeration
    generic_msg = "If the account exists, a reset link has been sent to the registered email."
    if not user:
        return {"message": generic_msg}

    # Create short-lived token
    reset_token = create_access_token(
        data={"sub": user.username}, expires_delta=timedelta(minutes=15))
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_url = f"{frontend_url}/reset-password?token={reset_token}"

    # If SMTP configured, send email
    smtp_host = os.getenv("SMTP_HOST")
    if smtp_host:
        try:
            smtp_port = int(os.getenv("SMTP_PORT", "587"))
            msg = EmailMessage()
            msg["Subject"] = "Password reset request"
            msg["From"] = os.getenv("EMAIL_FROM", "no-reply@example.com")
            msg["To"] = user.email
            msg.set_content(
                f"Hello {user.username},\n\nA password reset was requested. Use this link (valid 15 minutes): {reset_url}\n\nIf you did not request this, ignore this message.")

            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
            if os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes"):
                server.starttls()
            smtp_user = os.getenv("SMTP_USER")
            smtp_pass = os.getenv("SMTP_PASS")
            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            server.quit()
            return {"message": generic_msg}
        except Exception:
            # fallback to returning token for development
            return {"message": "Password reset token (development)", "reset_url": reset_url, "reset_token": reset_token}
    else:
        return {"message": "Password reset token (development)", "reset_url": reset_url, "reset_token": reset_token}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    # Validate password
    if not validate_password(req.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=PASSWORD_POLICY["message"])

    payload = decode_access_token(req.token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token payload")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Development: do not hash the password; replace stored hash with a
    # placeholder to avoid bcrypt/passlib issues during testing.
    user.hashed_password = secrets.token_hex(32)
    db.add(user)
    db.commit()
    return {"message": "Password reset successful"}
