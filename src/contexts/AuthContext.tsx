import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, LoginData } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: LoginData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, passwordRepeat: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string, newPasswordRepeat: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<LoginData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await apiService.isAuthenticated();
      if (authenticated) {
        const userData = await apiService.getUserData();
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Erro ao verificar status de autenticação:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login({ email, password });
      if (response.success && response.data) {
        setUser(response.data);
        setIsAuthenticated(true);
      } else {
        throw new Error(response.message || 'Erro no login');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Erro no login');
    }
  };

    const logout = async () => {
    try {
      await apiService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('AuthContext: Erro no logout:', error);
      // Mesmo com erro, limpar o estado local
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const register = async (email: string, password: string, passwordRepeat: string) => {
    try {
      const response = await apiService.createWallet({
        email,
        password,
        password_repeat: passwordRepeat,
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Erro no cadastro');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Erro no cadastro');
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await apiService.forgotPassword({ email });
      if (!response.success) {
        throw new Error(response.message || 'Erro ao solicitar recuperação de senha');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao solicitar recuperação de senha');
    }
  };

  const resetPassword = async (token: string, newPassword: string, newPasswordRepeat: string) => {
    try {
      const response = await apiService.resetPassword({
        token,
        new_password: newPassword,
        new_password_repeat: newPasswordRepeat,
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Erro ao redefinir senha');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao redefinir senha');
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    register,
    forgotPassword,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
