import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.core.rag_config import get_vector_store
from dotenv import load_dotenv
from typing import AsyncIterator

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# ── LLM Singleton ─────────────────────────────────────────────────────────────
# Created once per process — avoids re-authenticating and re-initialising
# the Gemini client on every query.
_llm_instance = None


def get_llm() -> ChatGoogleGenerativeAI:
    global _llm_instance
    if _llm_instance is None:
        print("[RAG] Initialising Gemini LLM...")
        _llm_instance = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            google_api_key=GOOGLE_API_KEY,
            temperature=0.3,
            max_output_tokens=2048,
        )
        print("[RAG] Gemini LLM ready.")
    return _llm_instance


def format_docs(docs):
    return "\n\n".join(
        f"[Source: {doc.metadata.get('source', 'Unknown')}]\n{doc.page_content}"
        for doc in docs
    )


PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "You are an expert enterprise assistant. "
     "Use ONLY the provided context to answer the question. "
     "If the answer is not in the context, say 'I could not find this information in the uploaded documents.' "
     "Cite the source document name when relevant. "
     "Present the information in a beautifully structured, highly readable format using clean markdown "
     "such as headers (###), bullet points, and bold text for key metrics, scores, or facts. "
     "Organize details into logical sections (e.g., Experience, Skills, Projects, Achievements) "
     "where appropriate to ensure a premium, visual layout. "
     "Be concise, clear, and professional."),
    ("human",
     "Context:\n{context}\n\nQuestion: {question}"),
])


async def get_streaming_response(query: str) -> dict:
    """Non-streaming endpoint — returns full answer at once."""
    try:
        vector_store = get_vector_store()
        retriever = vector_store.as_retriever(search_kwargs={"k": 4})
        docs = retriever.invoke(query)
        sources = list(set([doc.metadata.get("source", "Unknown") for doc in docs]))
        context = format_docs(docs)

        llm = get_llm()
        chain = PROMPT | llm | StrOutputParser()
        answer = chain.invoke({"context": context, "question": query})

        return {"answer": answer, "sources": sources}

    except Exception as e:
        print(f"[RAG ERROR] {e}")
        return {
            "answer": f"⚠️ An error occurred while processing your question. Details: {str(e)[:300]}",
            "sources": []
        }


async def stream_rag_response(query: str) -> AsyncIterator[str]:
    """
    True token-by-token streaming from Gemini.
    Yields chunks of text as they arrive, then a final JSON metadata line.
    """
    vector_store = get_vector_store()
    retriever = vector_store.as_retriever(search_kwargs={"k": 4})
    docs = retriever.invoke(query)
    sources = list(set([doc.metadata.get("source", "Unknown") for doc in docs]))
    context = format_docs(docs)

    llm = get_llm()
    chain = PROMPT | llm | StrOutputParser()

    # Stream tokens as they arrive from Gemini
    async for chunk in chain.astream({"context": context, "question": query}):
        yield chunk

    # Signal end with sources metadata (frontend parses this)
    import json
    yield f"\n\n__SOURCES__:{json.dumps(sources)}"
