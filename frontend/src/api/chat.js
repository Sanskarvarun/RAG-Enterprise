import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

export const sendQuestion = async (token, question, conversationId = null) => {
  const response = await axios.post(
    `${API_URL}/chat/ask`,
    { question, conversation_id: conversationId },
    { headers: authHeader(token) }
  );
  return response.data;
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
