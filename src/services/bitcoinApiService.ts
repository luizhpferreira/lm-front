import axios, { AxiosInstance } from 'axios';

// Interfaces baseadas nos modelos do backend Go
export interface FeeResponse {
  fastest_fee: number;
  half_hour_fee: number;
  hour_fee: number;
  economy_fee: number;
  minimum_fee: number;
}

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  script_pub_key: string;
  address: string;
  confirmations: number;
}

export interface UTXOResponse {
  utxos: UTXO[];
  total: number;
}

export interface BalanceResponse {
  address: string;
  balance: number;
  unconfirmed: number;
  total_received: number;
  total_sent: number;
  tx_count: number;
}

export interface Transaction {
  txid: string;
  block_height: number;
  time: string;
  value: number;
  fee: number;
  confirmations: number;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
}

export interface AddressValidationRequest {
  address: string;
}

export interface AddressValidationResponse {
  address: string;
  valid: boolean;
  type?: string;
  network?: string;
  error?: string;
}

export interface FeeEstimateRequest {
  inputs: number;
  outputs: number;
  fee_rate?: number;
}

export interface FeeEstimateResponse {
  estimated_fee: number;
  fee_rate: number;
  size: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

class BitcoinApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Usar o IP da máquina para o iPhone conseguir acessar
    this.baseURL = 'http://192.168.0.2:8082';
    console.log('BitcoinApiService: Conectando ao backend em:', this.baseURL);
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para tratar erros
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Bitcoin API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Obtém as taxas atuais da rede Bitcoin
   */
  async getFees(): Promise<FeeResponse> {
    try {
      const response = await this.api.get<ApiResponse<FeeResponse>>('/api/v1/bitcoin/fees');
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch fees');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Error fetching fees:', error);
      throw new Error('Falha ao obter taxas da rede');
    }
  }

  /**
   * Obtém taxas recomendadas
   */
  async getRecommendedFees(): Promise<FeeResponse> {
    try {
      const response = await this.api.get<ApiResponse<FeeResponse>>('/api/v1/bitcoin/fees/recommended');
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch recommended fees');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Error fetching recommended fees:', error);
      throw new Error('Falha ao obter taxas recomendadas');
    }
  }

  /**
   * Obtém UTXOs de um endereço
   */
  async getUTXOs(address: string): Promise<UTXOResponse> {
    try {
      const response = await this.api.get<ApiResponse<UTXOResponse>>(`/api/v1/bitcoin/utxos/${address}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch UTXOs');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Error fetching UTXOs:', error);
      throw new Error('Falha ao obter UTXOs do endereço');
    }
  }

  /**
   * Obtém o saldo de um endereço
   */
  async getBalance(address: string): Promise<BalanceResponse> {
    try {
      const response = await this.api.get<ApiResponse<BalanceResponse>>(`/api/v1/bitcoin/balance/${address}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch balance');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Error fetching balance:', error);
      throw new Error('Falha ao obter saldo do endereço');
    }
  }

  /**
   * Obtém transações de um endereço
   */
  async getTransactions(address: string): Promise<TransactionsResponse> {
    try {
      const response = await this.api.get<ApiResponse<TransactionsResponse>>(`/api/v1/bitcoin/transactions/${address}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch transactions');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      throw new Error('Falha ao obter transações do endereço');
    }
  }

  /**
   * Valida um endereço Bitcoin
   */
  async validateAddress(address: string): Promise<AddressValidationResponse> {
    try {
      const request: AddressValidationRequest = { address };
      const response = await this.api.post<ApiResponse<AddressValidationResponse>>(
        '/api/v1/bitcoin/validate-address',
        request
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to validate address');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Error validating address:', error);
      throw new Error('Falha ao validar endereço');
    }
  }

  /**
   * Estima a taxa para uma transação
   */
  async estimateFee(inputs: number, outputs: number, feeRate?: number): Promise<FeeEstimateResponse> {
    try {
      const request: FeeEstimateRequest = {
        inputs,
        outputs,
        fee_rate: feeRate,
      };

      const response = await this.api.post<ApiResponse<FeeEstimateResponse>>(
        '/api/v1/bitcoin/estimate-fee',
        request
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to estimate fee');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('Error estimating fee:', error);
      throw new Error('Falha ao estimar taxa da transação');
    }
  }

  /**
   * Health check do backend
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }
}

export const bitcoinApiService = new BitcoinApiService();
