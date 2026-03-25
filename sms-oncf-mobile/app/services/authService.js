import axios from 'axios';

export const API_URL = 'http://192.168.0.105:8080/api/auth';

export const login = async (email, password) => {
  const response = await axios.post(`${API_URL}/login`, { email, password });
  return response.data;
};

export const register = async (fullName, email, password, role) => {
  const response = await axios.post(`${API_URL}/register`, {
    fullName, email, password, role
  });
  return response.data;
};