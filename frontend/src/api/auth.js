import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/auth';

export const register = async (userData) => {
  const response = await axios.post(`${API_URL}/register`, userData);
  return response.data;
};

export const login = async (username, password) => {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  
  const response = await axios.post(`${API_URL}/login`, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data;
};

export const forgotPassword = async ({ email, username }) => {
  const response = await axios.post(`${API_URL}/forgot-password`, { email, username });
  return response.data;
};

export const resetPassword = async (token, new_password) => {
  const response = await axios.post(`${API_URL}/reset-password`, { token, new_password });
  return response.data;
};

export const getPasswordPolicy = async () => {
  const response = await axios.get(`${API_URL}/password-policy`);
  return response.data;
};
