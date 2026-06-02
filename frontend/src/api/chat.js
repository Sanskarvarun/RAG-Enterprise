import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

/** Legacy non-streaming call (kept as fallback) */
export const sendQuestion = async (token, question, conversationId = null) => {
  const response = await axios.post(
    `${API_URL}/chat/ask`,
    { question, conversation_id: conversationId },
    { headers: authHeader(token) }
  );
  return response.data;
};

/**
 * Streaming call — calls onChunk for every token as it arrives,
 * and onDone({ conversationId, sources }) when the stream ends.
 */
export const sendQuestionStream = async (
  token,
  question,
  conversationId,
  onChunk,
  onDone,
  onError
) => {
  try {
    const response = await fetch(`${API_URL}/chat/ask_stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ question, conversation_id: conversationId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Stream failed' }));
      throw new Error(err.detail || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let sources = [];
    let newConvId = conversationId;

    // Extract conversation_id from response headers if available
    const convHeader = response.headers.get('X-Conversation-Id');
    if (convHeader) newConvId = parseInt(convHeader, 10);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'token') {
            onChunk(parsed.content);
          } else if (parsed.type === 'sources') {
            sources = parsed.content;
          } else if (parsed.type === 'error') {
            throw new Error(parsed.content);
          }
        } catch (e) {
          console.error("Failed to parse JSON line:", line, e);
          if (e.message && line.includes('"type":"error"')) {
            throw e;
          }
        }
      }
    }

    // Process leftover buffer just in case
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        if (parsed.type === 'token') {
          onChunk(parsed.content);
        } else if (parsed.type === 'sources') {
          sources = parsed.content;
        } else if (parsed.type === 'error') {
          throw new Error(parsed.content);
        }
      } catch (_) {}
    }

    onDone({ conversationId: newConvId, sources });
  } catch (err) {
    onError(err.message || 'Stream failed');
  }
};

export const getConversations = async (token) => {
  const response = await axios.get(`${API_URL}/chat/conversations`, {
    headers: authHeader(token),
  });
  return response.data;
};

export const getMessages = async (token, conversationId) => {
  const response = await axios.get(
    `${API_URL}/chat/conversations/${conversationId}/messages`,
    { headers: authHeader(token) }
  );
  return response.data;
};

export const deleteConversation = async (token, conversationId) => {
  await axios.delete(`${API_URL}/chat/conversations/${conversationId}`, {
    headers: authHeader(token),
  });
};
