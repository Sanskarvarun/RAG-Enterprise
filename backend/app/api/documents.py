from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Request
from sqlalchemy.orm import Session
import os
import shutil
from typing import List, Optional
from app.db.database import get_db
from app.models.document import Document
from app.services.document_service import process_document
from app.core.security import decode_access_token
from fastapi.security import OAuth2PasswordBearer
from app.core.sanitization import sanitize_text

router = APIRouter(prefix="/documents", tags=["documents"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def optional_oauth2_scheme(request: Request):
    if os.getenv("DEV_NO_AUTH", "false").lower() in ("1", "true", "yes"):
        return None
    return await oauth2_scheme(request)


def get_current_user_id(token: Optional[str] = Depends(optional_oauth2_scheme)):
    # Development bypass: return dev username if DEV_NO_AUTH enabled
    if os.getenv("DEV_NO_AUTH", "false").lower() in ("1", "true", "yes"):
        return os.getenv("DEV_USER_USERNAME", "devuser")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    # In a real app, you'd lookup ID from username. For now, we'll store username or mock ID
    return payload.get("sub")


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user_id)
):
    # Basic validation: allowed extensions and max size
    allowed_exts = {"pdf", "docx", "doc", "txt", "csv"}
    filename = sanitize_text(file.filename)
    ext = filename.split(
        ".")[-1].lower() if filename and "." in filename else ""
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400, detail=f"Unsupported file type: {ext}")

    # Check file size (max 25MB)
    try:
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        if size > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=400, detail="File too large (max 25MB)")
    except Exception:
        # If we can't determine size, proceed but warn in logs
        pass
    # 1. Save file to temp directory
    upload_dir = "uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)

    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 2. Create database entry
    # Using username as temporary owner_id if we didn't setup integer ID lookup yet
    new_doc = Document(
        filename=filename,
        file_type=file.filename.split(".")[-1],
        status="pending",
        # owner_id=1  # Mock ID for now or adjust based on User model
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # 3. Process immediately (Synchronous)
    try:
        process_document(file_path, file.filename)
        new_doc.status = "completed"
    except Exception as e:
        print(f"Error processing doc: {e}")
        new_doc.status = "error"

    db.commit()

    return {"message": "File uploaded and processed successfully", "document_id": new_doc.id}


@router.get("/", response_model=List[dict])
def get_documents(db: Session = Depends(get_db), username: str = Depends(get_current_user_id)):
    # List documents (optionally filter by user)
    docs = db.query(Document).all()
    result = []
    for doc in docs:
        result.append({
            "id": doc.id,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "status": doc.status,
            "created_at": doc.created_at
        })
    return result


@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_user_id)
):
    # 1. Fetch document from PostgreSQL/SQLite DB
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # 2. Delete actual file from uploads folder
    file_path = os.path.join("uploads", doc.filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Error removing file from disk: {e}")

    # 3. Delete chunks from Chroma Vector Store
    try:
        from app.core.rag_config import get_vector_store
        vector_store = get_vector_store()
        if hasattr(vector_store, "_collection"):
            vector_store._collection.delete(where={"source": doc.filename})
        else:
            vector_store.delete(where={"source": doc.filename})
    except Exception as e:
        print(f"Error deleting from Chroma: {e}")

    # 4. Delete document entry from DB
    db.delete(doc)
    db.commit()

    return {"message": "Document deleted successfully"}
