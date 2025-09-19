import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, LoginData } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: LoginData | null;
  loading: boolean;
  login: (cpf: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, cpf: string, password: string, passwordRepeat: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string, newPasswordRepeat: string) => Promise<void>;
  confirmEmail: (token: string) => Promise<void>;
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

  const login = async (cpf: string, password: string) => {
    try {
      const response = await apiService.login({ email: cpf, password }); // Usa CPF como email
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

  const register = async (email: string, cpf: string, password: string, passwordRepeat: string) => {
    try {
      console.log('DEBUG: AuthContext register called with:', { email, cpf, passwordLength: password?.length, passwordRepeatLength: passwordRepeat?.length });
      
      // Remove formatação do CPF (pontos e hífens)
      const cleanCpf = cpf.replace(/\D/g, '');
      
      const response = await apiService.createWallet({
        username: cleanCpf, // CPF limpo
        email,              // Email do usuário
        password,
        password_repeat: passwordRepeat,
      });
      
      console.log('DEBUG: AuthContext register response:', response);
      
      if (!response.success) {
        throw new Error(response.message || 'Erro no cadastro');
      }
    } catch (error: any) {
      console.log('DEBUG: AuthContext register error:', error);
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

  const confirmEmail = async (token: string) => {
    try {
      const response = await apiService.confirmEmail(token);
      if (!response.success) {
        throw new Error(response.message || 'Erro ao confirmar email');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao confirmar email');
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
    confirmEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
