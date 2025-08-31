import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tipos de dados
export interface CreateWalletRequest {
  username: string; // CPF do usuário
  email: string;    // Email do usuário
  password: string;
  password_repeat: string;
}

export interface CpfCheckRequest {
  user: string;
}

export interface CpfCheckResponse {
  available: boolean;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
  new_password_repeat: string;
}

export interface CreateInvoiceRequest {
  amount: number;
  memo: string;
  // wallet_id será preenchido automaticamente pelo backend
}

export interface PayInvoiceRequest {
  payment_request: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface WalletData {
  id: number;
  email: string;
  wallet_id: string;
  created_at: string;
  updated_at: string;
}

export interface WalletBalanceData {
  wallet_id: string;
  email: string;
  balance: number;
  pending: number;
  max_pending: number;
}

export interface LoginData {
  wallet_id: string;
  email: string;
  username: string; // CPF do usuário
  token: string;
  message: string;
}

export interface InvoiceData {
  payment_request: string;
  payment_hash: string;
  amount: number;
  memo: string;
  expires_at?: string;
}

export interface PaymentData {
  payment_hash: string;
  paid: boolean;
  amount: number;
  memo: string;
}

class ApiService {
  private api: AxiosInstance;
  private baseURL: string = 'https://luma.app.br'; 
  //private baseURL: string = 'http://10.0.2.2:8080'; // URL local para emulador Android

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para adicionar token automaticamente
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor para tratar erros
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expirado, limpar storage
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user_data');
        }
        return Promise.reject(error);
      }
    );
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.api.get('/health');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Criar carteira (cadastro)
  async createWallet(data: CreateWalletRequest): Promise<ApiResponse<{ wallet_id: string; email: string; message: string }>> {
    try {
      console.log('DEBUG: ApiService createWallet called with:', data);
      const response: AxiosResponse<ApiResponse> = await this.api.post('/api/v1/wallets', data);
      console.log('DEBUG: ApiService createWallet response:', response.data);
      return response.data;
    } catch (error: any) {
      console.log('DEBUG: ApiService createWallet error:', error);
      throw this.handleError(error);
    }
  }

  // Login
  async login(data: LoginRequest): Promise<ApiResponse<LoginData>> {
    try {
      console.log('DEBUG: ApiService login called with:', data);
      const response: AxiosResponse<ApiResponse<LoginData>> = await this.api.post('/api/v1/login', data);
      
      if (response.data.success && response.data.data?.token) {
        // Salvar token e dados do usuário
        await AsyncStorage.setItem('auth_token', response.data.data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.data));
        console.log('DEBUG: ApiService login - token saved successfully');
      }
      
      return response.data;
    } catch (error: any) {
      console.log('DEBUG: ApiService login error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // Refresh token
  async refreshToken(): Promise<ApiResponse<{ token: string; message: string }>> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.api.post('/api/v1/refresh');
      
      if (response.data.success && response.data.data?.token) {
        await AsyncStorage.setItem('auth_token', response.data.data.token);
      }
      
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Esqueci a senha
  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.api.post('/api/v1/forgot-password', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Reset de senha
  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.api.post('/api/v1/reset-password', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Confirmar email
  async confirmEmail(token: string): Promise<ApiResponse<{ message: string; email: string }>> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.api.post('/api/v1/confirm-email', { token });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Obter informações da carteira
  async getWalletInfo(): Promise<ApiResponse<WalletData>> {
    try {
      const response: AxiosResponse<ApiResponse<WalletData>> = await this.api.get('/api/v1/wallets');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Obter saldo da carteira
  async getWalletBalance(): Promise<ApiResponse<WalletBalanceData>> {
    try {
      const response: AxiosResponse<ApiResponse<WalletBalanceData>> = await this.api.get('/api/v1/wallets/balance');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Criar invoice
  async createInvoice(data: CreateInvoiceRequest): Promise<ApiResponse<InvoiceData>> {
    try {
      const response: AxiosResponse<ApiResponse<InvoiceData>> = await this.api.post('/api/v1/invoices', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Verificar status do pagamento
  async checkPaymentStatus(paymentHash: string): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.api.get(`/api/v1/payments/status?payment_hash=${paymentHash}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Pagar invoice
  async payInvoice(paymentRequest: string): Promise<ApiResponse<PaymentData>> {
    try {
      const response: AxiosResponse<ApiResponse<PaymentData>> = await this.api.post('/api/v1/payments', {
        payment_request: paymentRequest
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Verificar disponibilidade de CPF
  async checkCpf(cpf: string): Promise<ApiResponse<CpfCheckResponse>> {
    try {
      const response: AxiosResponse<ApiResponse<CpfCheckResponse>> = await this.api.post('/api/v1/check-cpf', { user: cpf });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Logout
    async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
    } catch (error) {
      console.error('ApiService: Erro ao fazer logout:', error);
      throw error;
    }
  }

  // Verificar se está autenticado
  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('auth_token');
    return !!token;
  }

  // Obter dados do usuário
  async getUserData(): Promise<LoginData | null> {
    const userData = await AsyncStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  private handleError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    if (error.message) {
      return new Error(error.message);
    }
    return new Error('Erro desconhecido');
  }
}

export const apiService = new ApiService();
