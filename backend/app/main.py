from app.db.database import ensure_db_schema
from app.api.admin import router as admin_router
from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.core.rate_limiter import SimpleRateLimiterMiddleware
from app.models.chat import Message, Conversation
from app.models.document import Document
from app.models.user import User
from app.db.database import engine, Base
from app.api.auth import router as auth_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Compatibility fix for passlib + bcrypt 4.0+
import bcrypt
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type("about", (object,), {
                            "__version__": bcrypt.__version__})

load_dotenv()


# Create database tables
Base.metadata.create_all(bind=engine)

# Ensure any lightweight schema upgrades are applied (development only)
ensure_db_schema()

app = FastAPI(title="Enterprise AI Assistant API")

# Simple in-memory rate limiter (dev only)
app.add_middleware(SimpleRateLimiterMiddleware,
                   max_requests=120, window_seconds=60)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev, allowing all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(admin_router)


@app.get("/")
async def root():
    return {"message": "Welcome to the Enterprise AI Assistant API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
