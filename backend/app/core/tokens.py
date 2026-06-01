from functools import lru_cache


@lru_cache(maxsize=1)
def _get_encoder():
    try:
        import tiktoken
        try:
            return tiktoken.get_encoding("cl100k_base")
        except Exception:
            try:
                return tiktoken.get_encoding("gpt2")
            except Exception:
                return None
    except Exception:
        return None


def get_token_count(text: str) -> int:
    if not text:
        return 0
    enc = _get_encoder()
    if enc:
        try:
            return len(enc.encode(text))
        except Exception:
            pass
    # Fallback heuristic: 1 token ~= 4 characters
    return max(1, int(len(text) / 4))
