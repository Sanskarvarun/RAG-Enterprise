import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv

load_dotenv()

EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
CHROMA_PERSIST_DIR = os.path.join(os.getcwd(), "chroma_db")

# ── Singletons ────────────────────────────────────────────────────────────────
# These are created once per server process and reused on every request.
# Previously they were re-created on every call, which reloaded the ~90MB
# sentence-transformers model and reopened the Chroma DB each time.
_embeddings_instance = None
_vector_store_instance = None


def get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings_instance
    if _embeddings_instance is None:
        print("[RAG] Loading embedding model (first request only)...")
        _embeddings_instance = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL_NAME,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        print("[RAG] Embedding model ready.")
    return _embeddings_instance


def get_vector_store() -> Chroma:
    global _vector_store_instance
    if _vector_store_instance is None:
        print("[RAG] Opening Chroma vector store...")
        _vector_store_instance = Chroma(
            persist_directory=CHROMA_PERSIST_DIR,
            embedding_function=get_embeddings(),
        )
        print("[RAG] Chroma ready.")
    return _vector_store_instance


def invalidate_vector_store():
    """Call this after adding/deleting documents so the next request gets a fresh store."""
    global _vector_store_instance
    _vector_store_instance = None
