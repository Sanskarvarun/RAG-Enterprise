import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader, CSVLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.rag_config import get_vector_store

# Directory to temporarily store uploaded files
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)


def _load_pdf(file_path: str) -> list:
    """
    2-stage PDF text extraction:
    1. PyPDFLoader  — fast, handles standard text-based PDFs
    2. PyMuPDF      — more robust, handles complex layouts & encodings
    Raises ValueError if neither can extract text (truly scanned/image PDFs).
    """
    # --- Stage 1: PyPDFLoader ---
    try:
        docs = PyPDFLoader(file_path).load()
        text = " ".join(d.page_content for d in docs).strip()
        if text:
            print(f"[PDF] PyPDFLoader: extracted text from {len(docs)} page(s).")
            return docs
    except Exception as e:
        print(f"[PDF] PyPDFLoader failed ({e}), trying PyMuPDF...")

    # --- Stage 2: PyMuPDF native text extraction ---
    try:
        import pymupdf
        pdf_docs = []
        with pymupdf.open(file_path) as pdf:
            for page_num, page in enumerate(pdf):
                text = page.get_text("text").strip()
                if text:
                    pdf_docs.append(Document(
                        page_content=text,
                        metadata={"page": page_num, "source": os.path.basename(file_path)}
                    ))
        if pdf_docs:
            print(f"[PDF] PyMuPDF: extracted text from {len(pdf_docs)} page(s).")
            return pdf_docs
    except Exception as e:
        print(f"[PDF] PyMuPDF also failed: {e}")

    # Both stages failed — truly scanned/image PDF
    raise ValueError(
        "This PDF contains no extractable text (it appears to be a scanned or image-only document). "
        "Please use a text-based PDF exported from Word, Google Docs, or similar."
    )


def process_document(file_path: str, filename: str):
    """Load, chunk, embed, and store a document in the vector store."""
    file_ext = os.path.splitext(file_path)[1].lower()

    if file_ext == ".pdf":
        documents = _load_pdf(file_path)
    elif file_ext in [".docx", ".doc"]:
        documents = Docx2txtLoader(file_path).load()
    elif file_ext == ".txt":
        documents = TextLoader(file_path, encoding="utf-8").load()
    elif file_ext == ".csv":
        documents = CSVLoader(file_path, encoding="utf-8").load()
    else:
        raise ValueError(f"Unsupported file type: {file_ext}")

    # Split into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
        length_function=len,
    )
    chunks = text_splitter.split_documents(documents)

    if not chunks:
        raise ValueError(
            "No text could be extracted from this file. "
            "The document appears to contain no readable text content."
        )

    # Tag every chunk with the source filename (needed for deletion by source)
    for chunk in chunks:
        chunk.metadata["source"] = filename

    # Generate embeddings and store in Chroma
    vector_store = get_vector_store()
    vector_store.add_documents(chunks)

    return len(chunks)
