import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.rag_config import get_vector_store

# Directory to temporarily store uploaded files
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

def process_document(file_path: str, filename: str):
    # 1. Load the document
    file_ext = os.path.splitext(filename)[1].lower()
    
    if file_ext == ".pdf":
        loader = PyPDFLoader(file_path)
    elif file_ext in [".docx", ".doc"]:
        loader = Docx2txtLoader(file_path)
    elif file_ext == ".txt":
        loader = TextLoader(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_ext}")

    documents = loader.load()
    
    # 2. Split characters into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
        length_function=len,
    )
    chunks = text_splitter.split_documents(documents)
    
    # 3. Add metadata (e.g., filename)
    for chunk in chunks:
        chunk.metadata["source"] = filename

    # 4. Generate embeddings and store in Chroma
    vector_store = get_vector_store()
    vector_store.add_documents(chunks)
    
    return len(chunks)
