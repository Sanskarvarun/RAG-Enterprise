import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

// Auth is disabled — all routes are accessible without login.
// A static dev user is returned immediately so ProtectedRoute guards pass.
export const AuthProvider = ({ children }) => {
  const DEV_USER = { username: 'devuser', name: 'Dev User', isAdmin: true };

  const [user] = useState(DEV_USER);
  const [token] = useState('dev-no-auth');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Immediately mark as ready — no API call needed
    setLoading(false);
  }, []);

  // No-op login / logout since auth is disabled
  const login = async () => DEV_USER;
  const logout = () => {};

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
