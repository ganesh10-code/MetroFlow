import React, { createContext, useState, useEffect, ReactNode } from "react";

import { jwtDecode } from "jwt-decode";

interface User {
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  // ------------------------------------
  // LOAD USER FROM TOKEN
  // ------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const decoded: any = jwtDecode(token);

      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");

        setUser(null);
      } else {
        setUser({
          username: decoded.sub,
          role: decoded.role?.toUpperCase(),
        });
      }
    } catch {
      localStorage.removeItem("token");

      setUser(null);
    }

    setLoading(false);
  }, []);

  // ------------------------------------
  // LOGIN
  // ------------------------------------
  const login = (token: string) => {
    localStorage.setItem("token", token);

    const decoded: any = jwtDecode(token);

    setUser({
      username: decoded.sub,
      role: decoded.role?.toUpperCase(),
    });
  };

  // ------------------------------------
  // LOGOUT
  // ------------------------------------
  const logout = () => {
    localStorage.removeItem("token");

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
