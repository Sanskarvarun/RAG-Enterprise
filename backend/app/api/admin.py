from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.chat import Conversation, Message
import os
import secrets
from app.core.security import decode_access_token
from fastapi.security import OAuth2PasswordBearer
from app.core.sanitization import sanitize_text
from sqlalchemy import func

router = APIRouter(prefix="/admin", tags=["admin"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def optional_oauth2_scheme(request: Request):
    if os.getenv("DEV_NO_AUTH", "false").lower() in ("1", "true", "yes"):
        return None
    return await oauth2_scheme(request)


def get_current_user(token: Optional[str] = Depends(optional_oauth2_scheme), db: Session = Depends(get_db)):
    # Development bypass: return/create dev user when DEV_NO_AUTH enabled
    if os.getenv("DEV_NO_AUTH", "false").lower() in ("1", "true", "yes"):
        dev_username = os.getenv("DEV_USER_USERNAME", "devuser")
        dev_email = os.getenv("DEV_USER_EMAIL", "dev@example.com")
        dev_password = os.getenv("DEV_USER_PASSWORD", "dev_password")
        user = db.query(User).filter(User.username == dev_username).first()
        if not user:
            user = User(
                username=dev_username,
                email=dev_email,
                full_name="Dev User",
                hashed_password=secrets.token_hex(32),
                token_quota=1000000,
                tokens_used=0,
                is_active=True,
                is_admin=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    username = payload.get("sub")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def ensure_admin(user: User):
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


@router.get("/users")
def list_users(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ensure_admin(user)
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "created_at": u.created_at
        }
        for u in users
    ]


@router.get("/documents")
def list_documents(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ensure_admin(user)
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "file_type": d.file_type,
            "status": d.status,
            "owner_id": d.owner_id,
            "created_at": d.created_at,
            "updated_at": d.updated_at
        }
        for d in docs
    ]


@router.get("/analytics")
def analytics(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ensure_admin(user)
    total_users = db.query(User).count()
    total_docs = db.query(Document).count()
    total_conversations = db.query(Conversation).count()
    total_messages = db.query(Message).count()
    return {
        "total_users": total_users,
        "total_documents": total_docs,
        "total_conversations": total_conversations,
        "total_messages": total_messages,
    }


@router.get("/analytics/detailed")
def analytics_detailed(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ensure_admin(user)

    # Per-user conversation/message counts and approximate token usage
    users = db.query(User).all()
    data = []
    # Try to use a tokenizer for better token counts if available
    tokenizer = None
    try:
        import tiktoken
        try:
            tokenizer = tiktoken.get_encoding("cl100k_base")
        except Exception:
            tokenizer = tiktoken.get_encoding("gpt2")
    except Exception:
        tokenizer = None
    for u in users:
        convs = db.query(Conversation).filter(
            Conversation.user_id == u.id).all()
        conv_ids = [c.id for c in convs]
        msg_count = 0
        token_estimate = 0
        if conv_ids:
            msgs = db.query(Message).filter(
                Message.conversation_id.in_(conv_ids)).all()
            msg_count = len(msgs)
            for m in msgs:
                if m.content:
                    if tokenizer:
                        try:
                            token_estimate += len(tokenizer.encode(m.content))
                        except Exception:
                            token_estimate += max(1, int(len(m.content) / 4))
                    else:
                        # rough token estimate: 1 token ~= 4 chars
                        token_estimate += max(1, int(len(m.content) / 4))

        data.append({
            "user_id": u.id,
            "username": u.username,
            "conversations": len(conv_ids),
            "messages": msg_count,
            "approx_tokens": token_estimate,
            "tokens_used": getattr(u, 'tokens_used', 0) or 0,
            "token_quota": getattr(u, 'token_quota', 0) or 0,
            "tokens_remaining": max(0, (getattr(u, 'token_quota', 0) or 0) - (getattr(u, 'tokens_used', 0) or 0))
        })

    summary = {
        "users": len(users),
        "total_messages": db.query(Message).count(),
        "total_conversations": db.query(Conversation).count(),
        "per_user": data
    }
    return summary
