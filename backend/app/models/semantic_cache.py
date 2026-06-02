from sqlalchemy import Column, Integer, String, Text, DateTime
from app.db.database import Base
import datetime

class SemanticCache(Base):
    __tablename__ = "semantic_cache"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(String(1000), index=True)
    embedding = Column(Text)  # Stores JSON-encoded 384-dimensional vector float array
    answer = Column(Text)
    sources = Column(Text)    # Stores JSON-encoded file list
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
