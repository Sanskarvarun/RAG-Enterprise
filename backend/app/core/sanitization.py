import re


def sanitize_text(text: str, max_length: int = 4000) -> str:
    if not text:
        return text
    # Remove control characters
    text = re.sub(r"[\x00-\x1f\x7f]+", " ", text)
    # Trim and enforce max length
    text = text.strip()
    if len(text) > max_length:
        text = text[:max_length]
    return text
