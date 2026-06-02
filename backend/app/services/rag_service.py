import os
import json
from typing import AsyncIterator, Optional, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from sqlalchemy.orm import Session
from app.core.rag_config import get_vector_store, get_embeddings, get_bm25_retriever
from app.models.semantic_cache import SemanticCache
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# ── Singletons ─────────────────────────────────────────────────────────────
_llm_instance = None
_cross_encoder_instance = None


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


def get_cross_encoder():
    global _cross_encoder_instance
    if _cross_encoder_instance is None:
        print("[RAG] Loading Cross-Encoder re-ranker model...")
        from sentence_transformers import CrossEncoder
        _cross_encoder_instance = CrossEncoder(
            "cross-encoder/ms-marco-MiniLM-L-6-v2",
            device="cpu"
        )
        print("[RAG] Cross-Encoder re-ranker model ready.")
    return _cross_encoder_instance


# ── Prompts ────────────────────────────────────────────────────────────────
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

CONDENSE_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "Given the following conversation history and a follow-up question, "
     "rephrase the follow-up question to be a standalone question. "
     "The standalone question should contain all necessary context from the conversation history "
     "so it can be used for vector search/retrieval. Do NOT answer the question. "
     "Output ONLY the rephrased standalone question, with no introductory text or quotes."),
    ("human", "Conversation History:\n{chat_history}\n\nFollow-up Question: {question}")
])


# ── Helpers ────────────────────────────────────────────────────────────────
def format_docs(docs):
    return "\n\n".join(
        f"[Source: {doc.metadata.get('source', 'Unknown')}]\n{doc.page_content}"
        for doc in docs
    )


async def condense_query(query: str, chat_history: Optional[List[dict]]) -> str:
    if not chat_history:
        return query
    try:
        history_lines = []
        for msg in chat_history:
            role = "User" if msg.get("role") == "user" else "Assistant"
            history_lines.append(f"{role}: {msg.get('content')}")
        history_str = "\n".join(history_lines)

        llm = get_llm()
        chain = CONDENSE_PROMPT | llm | StrOutputParser()
        condensed = await chain.ainvoke({"chat_history": history_str, "question": query})
        condensed_clean = condensed.strip().strip('"').strip("'")
        print(f"[RAG] Rephrased query: '{query}' -> '{condensed_clean}'")
        return condensed_clean
    except Exception as e:
        print(f"[RAG] Failed to condense query: {e}")
        return query


def check_semantic_cache(db: Optional[Session], query: str, query_vector: List[float], threshold: float = 0.92) -> Optional[dict]:
    if db is None:
        return None
    try:
        cached_items = db.query(SemanticCache).all()
        best_match = None
        best_score = -1.0

        for item in cached_items:
            try:
                item_vector = json.loads(item.embedding)
                # Compute dot product (since both vectors are normalized)
                score = sum(x * y for x, y in zip(query_vector, item_vector))
                if score > best_score:
                    best_score = score
                    best_match = item
            except Exception:
                continue

        if best_match and best_score >= threshold:
            print(f"[RAG CACHE] Hit! Match found: '{best_match.query}' with score {best_score:.4f}")
            return {
                "answer": best_match.answer,
                "sources": json.loads(best_match.sources)
            }
    except Exception as e:
        print(f"[RAG CACHE] Error checking cache: {e}")
    return None


def save_to_semantic_cache(db: Optional[Session], query: str, query_vector: List[float], answer: str, sources: List[str]):
    if db is None:
        return
    try:
        new_cache = SemanticCache(
            query=query,
            embedding=json.dumps(query_vector),
            answer=answer,
            sources=json.dumps(sources)
        )
        db.add(new_cache)
        db.commit()
        print(f"[RAG CACHE] Saved query '{query}' to cache.")
    except Exception as e:
        print(f"[RAG CACHE] Error saving to cache: {e}")


def retrieve_hybrid_and_rerank(query: str, vector_store) -> List:
    """Retrieve chunks via Vector + BM25 search and re-rank them with Cross-Encoder."""
    # 1. Retrieve candidates
    vector_retriever = vector_store.as_retriever(search_kwargs={"k": 8})
    vector_docs = vector_retriever.invoke(query)

    bm25_retriever = get_bm25_retriever(vector_store)
    bm25_docs = bm25_retriever.invoke(query) if bm25_retriever else []

    # 2. Deduplicate
    seen_contents = set()
    merged_docs = []
    for doc in (vector_docs + bm25_docs):
        content_hash = doc.page_content.strip()
        if content_hash not in seen_contents:
            seen_contents.add(content_hash)
            merged_docs.append(doc)

    if not merged_docs:
        return []

    # 3. Neural Re-ranking using CrossEncoder
    try:
        cross_encoder = get_cross_encoder()
        pairs = [[query, doc.page_content] for doc in merged_docs]
        scores = cross_encoder.predict(pairs)
        ranked = sorted(zip(merged_docs, scores), key=lambda x: x[1], reverse=True)
        
        # Log re-ranking details for diagnostics
        print(f"[RAG SEARCH] Hybrid found {len(merged_docs)} unique docs. Re-ranked top scores:")
        for doc, score in ranked[:3]:
            print(f"  Score: {score:.4f} | Src: {doc.metadata.get('source')} | Snippet: {doc.page_content[:60]}...")

        return [doc for doc, score in ranked[:3]]
    except Exception as e:
        print(f"[RAG SEARCH] Re-ranking failed: {e}. Falling back to default top-3 merged docs.")
        return merged_docs[:3]


# ── RAG Workflows ──────────────────────────────────────────────────────────
async def get_streaming_response(query: str, chat_history: Optional[List[dict]] = None, db: Optional[Session] = None) -> dict:
    """Non-streaming endpoint — retrieves context, runs LLM, caches, and returns full answer."""
    try:
        vector_store = get_vector_store()

        # Phase 1: Check cache using original raw query
        raw_vector = get_embeddings().embed_query(query)
        cache_hit = check_semantic_cache(db, query, raw_vector)
        if cache_hit:
            return cache_hit

        # Phase 2: Condense query if history exists
        condensed_query = await condense_query(query, chat_history)

        # If rephrased query is different, check cache again
        if condensed_query != query:
            condensed_vector = get_embeddings().embed_query(condensed_query)
            cache_hit = check_semantic_cache(db, condensed_query, condensed_vector)
            if cache_hit:
                return cache_hit
            query_vector = condensed_vector
        else:
            query_vector = raw_vector

        # Phase 3: Retrieve & Re-rank
        final_docs = retrieve_hybrid_and_rerank(condensed_query, vector_store)
        sources = list(set([doc.metadata.get("source", "Unknown") for doc in final_docs]))
        context = format_docs(final_docs)

        # Phase 4: LLM Generate
        llm = get_llm()
        chain = PROMPT | llm | StrOutputParser()
        answer = chain.invoke({"context": context, "question": condensed_query})

        # Phase 5: Cache response under condensed query
        save_to_semantic_cache(db, condensed_query, query_vector, answer, sources)

        return {"answer": answer, "sources": sources}

    except Exception as e:
        print(f"[RAG ERROR] {e}")
        return {
            "answer": f"⚠️ An error occurred while processing your question. Details: {str(e)[:300]}",
            "sources": []
        }


async def stream_rag_response(query: str, chat_history: Optional[List[dict]] = None, db: Optional[Session] = None) -> AsyncIterator[str]:
    """True token-by-token streaming from Gemini, integrated with Query Condensing, Hybrid Re-ranking, and Semantic Cache."""
    try:
        vector_store = get_vector_store()

        # Phase 1: Check cache using original raw query
        raw_vector = get_embeddings().embed_query(query)
        cache_hit = check_semantic_cache(db, query, raw_vector)
        if cache_hit:
            yield cache_hit["answer"]
            yield f"\n\n__SOURCES__:{json.dumps(cache_hit['sources'])}"
            return

        # Phase 2: Condense query if history exists
        condensed_query = await condense_query(query, chat_history)

        # If rephrased query is different, check cache again
        if condensed_query != query:
            condensed_vector = get_embeddings().embed_query(condensed_query)
            cache_hit = check_semantic_cache(db, condensed_query, condensed_vector)
            if cache_hit:
                yield cache_hit["answer"]
                yield f"\n\n__SOURCES__:{json.dumps(cache_hit['sources'])}"
                return
            query_vector = condensed_vector
        else:
            query_vector = raw_vector

        # Phase 3: Retrieve & Re-rank
        final_docs = retrieve_hybrid_and_rerank(condensed_query, vector_store)
        sources = list(set([doc.metadata.get("source", "Unknown") for doc in final_docs]))
        context = format_docs(final_docs)

        # Phase 4: LLM Stream
        llm = get_llm()
        chain = PROMPT | llm | StrOutputParser()

        full_response = []
        async for chunk in chain.astream({"context": context, "question": condensed_query}):
            full_response.append(chunk)
            yield chunk

        # Phase 5: Cache completed response
        answer = "".join(full_response)
        save_to_semantic_cache(db, condensed_query, query_vector, answer, sources)

        # Phase 6: Signal end with sources metadata
        yield f"\n\n__SOURCES__:{json.dumps(sources)}"

    except Exception as e:
        print(f"[RAG STREAM ERROR] {e}")
        yield f"⚠️ An error occurred during streaming: {str(e)[:200]}"
