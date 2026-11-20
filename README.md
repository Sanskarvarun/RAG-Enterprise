# Enterprise Conversational AI Assistant (RAG-Enterprise)

A full-stack, production-style **Retrieval-Augmented Generation (RAG)** application that lets users ask natural-language questions over company documents and receive grounded, cited answers. It combines a FastAPI backend with a React (Vite) frontend, hybrid retrieval, cross-encoder re-ranking, semantic caching, and an admin dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Problem It Solves](#problem-it-solves)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Notes & Development](#notes--development)

---

## Overview

RAG-Enterprise is a multi-user conversational AI assistant. Users upload documents (PDF, DOCX, TXT, CSV), which are parsed, chunked, and embedded into a vector store. When a user asks a question, the system retrieves the most relevant chunks using hybrid search (dense vectors + BM25), re-ranks them with a cross-encoder, and feeds them to an LLM (Google Gemini) to generate a grounded answer with source citations. Conversations, messages, and a semantic cache are persisted in a database.

---

## Problem It Solves

- Employees waste time manually searching large, unstructured document repositories; keyword search misses semantic meaning.
- Generic LLMs hallucinate and have no access to proprietary company knowledge.
- Need for a secure, multi-tenant system with per-user conversation history, token quotas, and admin oversight.
- Need to control cost and latency by avoiding redundant LLM calls and improving retrieval precision.

---

## Key Features

### Document Ingestion
- Upload **PDF, DOCX, TXT, CSV** (max 25 MB per file).
- 2-stage PDF text extraction: **PyPDFLoader** → fallback to **PyMuPDF** for complex layouts.
- Chunking via `RecursiveCharacterTextSplitter` (chunk size 1000, overlap 100).
- Embeddings via `sentence-transformers/all-MiniLM-L6-v2` (local, CPU).
- Stored in **ChromaDB** with source filename metadata for deletion by source.

### Retrieval & Generation
- **Hybrid retrieval**: dense vector search (Chroma) + sparse **BM25** keyword search, merged and deduplicated.
- **Cross-encoder re-ranking** (`ms-marco-MiniLM-L-6-v2`) selects the top-3 most relevant chunks.
- **Query condensation**: rephrases follow-up questions into standalone queries using chat history.
- **Semantic caching**: cosine-similarity cache of prior Q&A in the DB to skip redundant LLM calls.
- **Streaming responses**: token-by-token SSE streaming with `__SOURCES__` metadata.
- Source citations returned with every answer.

### Auth, Users & Admin
- JWT-based authentication (register/login, password reset flow).
- Per-user conversation history and message persistence.
- Token quotas and usage tracking per user.
- Admin dashboard: list users, list documents, analytics (totals + per-user conversation/message/token estimates).
- Development bypass mode (`DEV_NO_AUTH`) for local testing.

### Security
- Input sanitization and max-length validation.
- Rate limiting middleware (120 req / 60s).
- Role-based admin access (`is_admin`).

---

## Tech Stack

### Backend
- **Python 3.11**, **FastAPI**, Uvicorn
- **LangChain** (orchestration), **Google Gemini** (LLM via `langchain-google-genai`)
- **HuggingFace sentence-transformers** (embeddings), **ChromaDB** (vector store)
- **BM25** retriever + cross-encoder re-ranker (`sentence-transformers`)
- **SQLAlchemy** + **PostgreSQL** (or SQLite by default)
- **JWT** (python-jose), passlib/bcrypt
- Document loaders: PyPDF, PyMuPDF, docx2txt, CSVLoader

### Frontend
- **React 19**, **Vite**, **Tailwind CSS**
- React Router, Framer Motion, Axios, Lucide React

### AI/ML Techniques
RAG, hybrid search (dense + sparse), cross-encoder re-ranking, query rewriting/condensation, semantic caching, streaming generation.

---

## Architecture

```
┌──────────────┐        HTTP/SSE        ┌──────────────────────────────┐
│  React (Vite)│ ◄────────────────────► │  FastAPI Backend             │
│  Tailwind UI │                        │  /auth  /documents  /chat    │
└──────────────┘                        │  /admin                      │
                                        └──────────┬───────────────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────┐
                    │                              │                      │
            ┌───────▼───────┐            ┌─────────▼────────┐   ┌────────▼────────┐
            │  PostgreSQL / │            │  ChromaDB        │   │  Google Gemini  │
            │  SQLite       │            │  (vectors)       │   │  (LLM)          │
            │  (users, chat,│            │  + BM25 index    │   └─────────────────┘
            │  semantic cache)│           └──────────────────┘
            └───────────────┘
```

---

## Project Structure

```
RAG-Enterprise/
├── backend/
│   ├── app/
│   │   ├── api/          # auth, documents, chat, admin routers
│   │   ├── core/         # security, rate_limiter, sanitization, rag_config, tokens
│   │   ├── db/           # database engine/session, schema helpers
│   │   ├── models/       # SQLAlchemy models (user, document, chat, semantic_cache) + schemas
│   │   └── services/     # document_service, rag_service
│   ├── requirements.txt
│   └── main.py
└── frontend/
    ├── src/
    │   ├── pages/        # Login, Register, Chat, Documents, Admin pages
    │   ├── components/
    │   ├── context/      # Auth, Theme
    │   └── api/          # axios setup, auth, chat
    ├── package.json
    └── vite.config.js
```

---

## Getting Started

### Prerequisites
- Python **3.11** (recommended)
- Node.js 18+ and npm
- (Optional) PostgreSQL; otherwise SQLite is used by default
- A **Google Gemini API key**

### 1. Backend

```bash
cd backend

# Create and activate a virtual environment (Python 3.11)
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt

# Create a .env file (see Environment Variables below)
# Then run the server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000` (Swagger docs at `/docs`).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## Environment Variables

Create a `.env` file in `backend/` (values shown are examples/defaults):

```env
# Database (defaults to local SQLite)
DATABASE_URL=sqlite:///./sql_app.db
# DATABASE_URL=postgresql://user:password@localhost:5432/rag_enterprise

# LLM (Google Gemini)
GOOGLE_API_KEY=your_google_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Development auth bypass (set to true to skip JWT/password checks)
DEV_NO_AUTH=true
DEV_USER_USERNAME=devuser
DEV_USER_EMAIL=dev@example.com

# Frontend URL (used for password reset links)
FRONTEND_URL=http://localhost:5173

# Optional: SMTP for password reset emails
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_TLS=true
# SMTP_USER=
# SMTP_PASS=
# EMAIL_FROM=no-reply@example.com
```

> Note: ChromaDB persists to `./chroma_db` relative to the backend working directory. Uploaded files are stored in `./uploads`.

---

## API Endpoints

Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login (OAuth2 form) → JWT |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |
| GET  | `/auth/password-policy` | Password policy |
| POST | `/documents/upload` | Upload & process a document |
| GET  | `/documents/` | List documents |
| DELETE | `/documents/{id}` | Delete document + its chunks |
| POST | `/chat/ask` | Ask a question (non-streaming) |
| POST | `/chat/ask_stream` | Ask a question (streaming SSE) |
| GET  | `/chat/conversations` | List user conversations |
| GET  | `/chat/conversations/{id}/messages` | Get messages of a conversation |
| DELETE | `/chat/conversations/{id}` | Delete a conversation |
| GET  | `/admin/users` | List users (admin) |
| GET  | `/admin/documents` | List all documents (admin) |
| GET  | `/admin/analytics` | Basic analytics (admin) |
| GET  | `/admin/analytics/detailed` | Detailed per-user analytics (admin) |

---

## Notes & Development

- **Dev mode**: with `DEV_NO_AUTH=true`, the backend auto-creates a dev admin user and skips password verification. Disable in production.
- **Database**: defaults to SQLite for easy local setup; set `DATABASE_URL` to use PostgreSQL.
- **Embeddings** run locally (no API key needed); only the LLM (Gemini) requires `GOOGLE_API_KEY`.
- **Re-ranking** model downloads on first use; first request may be slow.
- **Semantic cache** is cleared automatically when documents are uploaded or deleted.
- **Tests**: backend tests live in `backend/tests/` (pytest). Frontend uses ESLint (`npm run lint`).

---

## License

This project is provided as-is for educational/portfolio purposes. Add a license file if you plan to distribute it.