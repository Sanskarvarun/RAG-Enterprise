from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from sqlalchemy import inspect, text

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={
        "check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_db_schema():
    """Ensure the database has expected columns added by recent model changes.
    This runs lightweight ALTER TABLE statements when columns are missing.
    Intended for local development only (use proper migrations for production).
    """
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        if 'users' not in tables:
            return

        cols = [c['name'] for c in inspector.get_columns('users')]
        with engine.connect() as conn:
            # tokens_used
            if 'tokens_used' not in cols:
                if engine.dialect.name == 'sqlite':
                    conn.execute(
                        text("ALTER TABLE users ADD COLUMN tokens_used INTEGER DEFAULT 0"))
                else:
                    conn.execute(
                        text("ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0"))

            # token_quota
            if 'token_quota' not in cols:
                if engine.dialect.name == 'sqlite':
                    conn.execute(
                        text("ALTER TABLE users ADD COLUMN token_quota INTEGER DEFAULT 100000"))
                else:
                    conn.execute(text(
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS token_quota INTEGER DEFAULT 100000"))
    except Exception as e:
        # Don't raise here; this is a best-effort helper for development.
        print(f"[DB SCHEMA] ensure_db_schema error: {e}")
