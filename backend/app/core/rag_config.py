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


_bm25_retriever_instance = None


def get_bm25_retriever(vector_store):
    global _bm25_retriever_instance
    if _bm25_retriever_instance is None:
        print("[RAG] Building BM25 retriever...")
        try:
            # Fetch all documents currently in the vector DB
            all_content = vector_store._collection.get()
            ids = all_content.get("ids", [])
            if not ids:
                print("[RAG] BM25: Vector store is empty, skipping.")
                return None

            from langchain_core.documents import Document
            metadatas = all_content.get("metadatas", []) or []
            documents = all_content.get("documents", []) or []

            all_docs = []
            for i in range(len(ids)):
                meta = metadatas[i] if i < len(metadatas) else {}
                doc_text = documents[i] if i < len(documents) else ""
                all_docs.append(Document(
                    page_content=doc_text,
                    metadata=meta or {}
                ))

            if not all_docs:
                return None

            from langchain_community.retrievers import BM25Retriever
            _bm25_retriever_instance = BM25Retriever.from_documents(all_docs)
            _bm25_retriever_instance.k = 6
            print(f"[RAG] BM25 retriever ready with {len(all_docs)} documents.")
        except Exception as e:
            print(f"[RAG] Failed to build BM25 retriever: {e}")
            return None
    return _bm25_retriever_instance


def invalidate_rag_cache():
    """Invalidates the in-memory cache of Chroma DB and BM25 retriever."""
    global _vector_store_instance, _bm25_retriever_instance
    _vector_store_instance = None
    _bm25_retriever_instance = None
    print("[RAG] Cleared in-memory vector store and BM25 retriever caches.")


def invalidate_vector_store():
    """Wrapper for backward compatibility."""
    invalidate_rag_cache()
