import React, { createContext, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as loginApi } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loginApi(email, password);
      setUser({ 
        email: data.email, 
        fullName: data.fullName, 
        role: data.role,
        firstLogin: data.firstLogin 
      });
      setToken(data.token);
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data));
      return { success: true, firstLogin: data.firstLogin };
    } catch (err) {
      setError('Email ou mot de passe incorrect');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const logout = async (navigation) => {
  setUser(null);
  setToken(null);
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
  navigation.replace('Login');
};

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);