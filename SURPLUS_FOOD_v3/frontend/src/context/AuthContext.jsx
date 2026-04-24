import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(undefined); // undefined = "not yet hydrated"

  useEffect(() => {
    const saved = localStorage.getItem('surplusUser');
    setUser(saved ? JSON.parse(saved) : null);
  }, []);

  // userData is the full LoginResponse (includes access_token)
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('surplusUser', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('surplusUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
