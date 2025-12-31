import React, { createContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  register: (email: string, password: string, name: string) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  isAdmin: () => boolean;
  isEditor: () => boolean;
  isViewer: () => boolean;
  canEdit: () => boolean;
  canAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/me`);
          setUser(res.data.user);
        } catch (error) {
          console.error('Load user error:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token]);

  const register = async (email: string, password: string, name: string) => {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, {
      email, password, name
    });
    return res.data;
  };

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, {
      email, password
    });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  const isEditor = (): boolean => {
    return user?.role === 'editor';
  };

  const isViewer = (): boolean => {
    return user?.role === 'viewer';
  };

  const canEdit = (): boolean => {
    return user ? ['admin', 'editor'].includes(user.role) : false;
  };

  const canAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      register,
      login,
      logout,
      hasRole,
      hasAnyRole,
      isAdmin,
      isEditor,
      isViewer,
      canEdit,
      canAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
