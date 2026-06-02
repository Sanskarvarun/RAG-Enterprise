from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import json
from app.db.database import get_db
from app.models.chat import Conversation, Message
from app.models.user import User
from app.services.rag_service import get_streaming_response, stream_rag_response
import os
import secrets
from app.core.security import decode_access_token
from app.core.sanitization import sanitize_text
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from app.core.tokens import get_token_count

router = APIRouter(prefix="/chat", tags=["chat"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def optional_oauth2_scheme(request: Request):
    if os.getenv("DEV_NO_AUTH", "false").lower() in ("1", "true", "yes"):
        return None
    return await oauth2_scheme(request)


def get_current_user(token: Optional[str] = Depends(optional_oauth2_scheme), db: Session = Depends(get_db)):
    # Development bypass: return or create a dev user when DEV_NO_AUTH is enabled
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


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[int] = None


@router.post("/ask")
async def ask(
    request: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Sanitize input
    request.question = sanitize_text(request.question, max_length=4000)

    # Re-query user on this DB session so updates persist
    current_user = db.query(User).filter(User.id == user.id).first()
    if current_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Check token quota
    remaining = (current_user.token_quota or 0) - \
        (current_user.tokens_used or 0)
    if remaining <= 0:
        raise HTTPException(
            status_code=403, detail="Token quota exceeded. Please contact admin.")

    # 1. Get or create conversation
    if request.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == request.conversation_id).first()
        if not conversation:
            raise HTTPException(
                status_code=404, detail="Conversation not found")
    else:
        # Create new conversation with title derived from first question
        title = request.question[:60] + \
            "..." if len(request.question) > 60 else request.question
        conversation = Conversation(title=title, user_id=user.id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 2. Save user message
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=request.question
    )
    db.add(user_msg)
    db.commit()

    # Retrieve recent chat history for context
    history_msgs = db.query(Message).filter(
        Message.conversation_id == conversation.id,
        Message.id != user_msg.id
    ).order_by(Message.created_at.desc()).limit(6).all()
    history_msgs.reverse()
    chat_history = [{"role": msg.role, "content": msg.content} for msg in history_msgs]

    # 3. Get RAG response (integrated with query condensing, hybrid search, and cache)
    try:
        result = await get_streaming_response(request.question, chat_history=chat_history, db=db)
        answer = result["answer"]
        sources = result["sources"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

    # 4. Save assistant message
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=answer,
        sources=json.dumps(sources)
    )
    db.add(assistant_msg)
    db.commit()

    # Update token accounting: estimate tokens for user+assistant
    try:
        user_tokens = get_token_count(request.question)
        assistant_tokens = get_token_count(answer)
        total = user_tokens + assistant_tokens
        current_user.tokens_used = (current_user.tokens_used or 0) + total
        db.add(current_user)
        db.commit()
    except Exception:
        pass

    return {
        "conversation_id": conversation.id,
        "answer": answer,
        "sources": sources
    }


@router.post("/ask_stream")
async def ask_stream(
    request: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # 1. Sanitize input and get or create conversation
    request.question = sanitize_text(request.question, max_length=4000)

    # Re-query user on this DB session so updates persist
    current_user = db.query(User).filter(User.id == user.id).first()
    if current_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Check token quota
    remaining = (current_user.token_quota or 0) - \
        (current_user.tokens_used or 0)
    if remaining <= 0:
        raise HTTPException(
            status_code=403, detail="Token quota exceeded. Please contact admin.")

    # 1. Get or create conversation
    if request.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == request.conversation_id).first()
        if not conversation:
            raise HTTPException(
                status_code=404, detail="Conversation not found")
    else:
        title = request.question[:60] + \
            "..." if len(request.question) > 60 else request.question
        conversation = Conversation(title=title, user_id=user.id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 2. Save user message
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=request.question
    )
    db.add(user_msg)
    db.commit()

    # Retrieve recent chat history for context
    history_msgs = db.query(Message).filter(
        Message.conversation_id == conversation.id,
        Message.id != user_msg.id
    ).order_by(Message.created_at.desc()).limit(6).all()
    history_msgs.reverse()
    chat_history = [{"role": msg.role, "content": msg.content} for msg in history_msgs]

    full_answer = []

    async def event_stream():
        nonlocal full_answer
        try:
            sources = []
            async for chunk in stream_rag_response(request.question, chat_history=chat_history, db=db):
                # Detect the trailing metadata line
                if chunk.startswith("\n\n__SOURCES__:"):
                    sources_json = chunk.replace("\n\n__SOURCES__:", "")
                    try:
                        sources = json.loads(sources_json)
                    except Exception:
                        sources = []
                    yield json.dumps({"type": "sources", "content": sources}) + "\n"
                else:
                    full_answer.append(chunk)
                    yield json.dumps({"type": "token", "content": chunk}) + "\n"

            # Persist assistant message after stream is complete
            answer = "".join(full_answer)
            assistant_msg = Message(
                conversation_id=conversation.id,
                role="assistant",
                content=answer,
                sources=json.dumps(sources)
            )
            db.add(assistant_msg)
            db.commit()

            # Update token accounting
            try:
                user_tokens = get_token_count(request.question)
                assistant_tokens = get_token_count(answer)
                current_user.tokens_used = (current_user.tokens_used or 0) + user_tokens + assistant_tokens
                db.add(current_user)
                db.commit()
            except Exception:
                pass

        except Exception as e:
            yield json.dumps({"type": "error", "content": str(e)}) + "\n"

    headers = {"X-Conversation-Id": str(conversation.id)}
    return StreamingResponse(event_stream(), headers=headers, media_type="text/plain; charset=utf-8")


@router.get("/conversations")
def get_conversations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    convs = db.query(Conversation).filter(Conversation.user_id ==
                                          user.id).order_by(Conversation.created_at.desc()).all()
    return [{"id": c.id, "title": c.title, "created_at": c.created_at} for c in convs]


@router.get("/conversations/{conversation_id}/messages")
def get_messages(conversation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    msgs = db.query(Message).filter(Message.conversation_id ==
                                    conversation_id).order_by(Message.created_at.asc()).all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "sources": json.loads(m.sources) if m.sources else [],
            "created_at": m.created_at
        }
        for m in msgs
    ]


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Message).filter(
        Message.conversation_id == conversation_id).delete()
    db.query(Conversation).filter(Conversation.id == conversation_id).delete()
    db.commit()
    return {"message": "Deleted"}
