import sys
import os
import json

backend_path = r"c:\Users\china\Desktop\Enterprise AI Assistant\backend"
sys.path.append(backend_path)

from app.db.database import SessionLocal
from app.models.chat import Conversation, Message

db = SessionLocal()
try:
    convs = db.query(Conversation).all()
    with open("inspect_db_output.txt", "w", encoding="utf-8") as f:
        f.write(f"Total conversations: {len(convs)}\n")
        for conv in convs:
            f.write(f"\n================ Conversation ID: {conv.id} | Title: {conv.title} ================\n")
            messages = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.asc()).all()
            for msg in messages:
                f.write(f"\n[{msg.role.upper()}]:\n")
                f.write(msg.content + "\n")
                if msg.sources:
                    f.write(f"Sources: {msg.sources}\n")
    print("Successfully wrote database contents to inspect_db_output.txt")
finally:
    db.close()
