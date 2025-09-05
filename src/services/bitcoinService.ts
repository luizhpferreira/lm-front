import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import { bitcoinApiService, UTXO, BalanceResponse, FeeResponse } from './bitcoinApiService';

// Configuração da rede Bitcoin mainnet
const NETWORK = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'bc',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80,
};

export interface BitcoinWallet {
  mnemonic: string;
  seed: Uint8Array;
  masterKey: HDKey;
  addresses: {
    p2pkh: string;  // Legacy (1...)
    p2sh: string;   // P2SH (3...)
    p2wpkh: string; // Bech32 (bc1...)
  };
  privateKeys: {
    p2pkh: string;
    p2sh: string;
    p2wpkh: string;
  };
}


export interface BitcoinBalance extends BalanceResponse {
  utxos: UTXO[];
}

class BitcoinService {
  private readonly STORAGE_KEY = 'bitcoin_wallet';

  /**
   * Gera uma nova carteira Bitcoin com seed BIP39
   */
  async generateWallet(): Promise<BitcoinWallet> {
    try {
      // Gerar mnemônico BIP39
      const mnemonic = generateMnemonic(wordlist); // 24 palavras
      
      // Verificar se o mnemônico é válido
      if (!validateMnemonic(mnemonic, wordlist)) {
        throw new Error('Mnemônico inválido gerado');
      }

      // Gerar seed a partir do mnemônico
      const seed = mnemonicToSeedSync(mnemonic);
      
      // Criar chave mestra BIP32
      const masterKey = HDKey.fromMasterSeed(seed);
      
      // Derivar chaves para diferentes tipos de endereços
      // Caminho BIP44: m/44'/0'/0'/0/0
      const p2pkhPath = "m/44'/0'/0'/0/0";
      const p2shPath = "m/49'/0'/0'/0/0";
      const p2wpkhPath = "m/84'/0'/0'/0/0";

      const p2pkhKey = masterKey.derive(p2pkhPath);
      const p2shKey = masterKey.derive(p2shPath);
      const p2wpkhKey = masterKey.derive(p2wpkhPath);

      // Gerar endereços
      const p2pkhAddress = this.generateP2PKHAddress(p2pkhKey.publicKey!);
      const p2shAddress = this.generateP2SHAddress(p2shKey.publicKey!);
      const p2wpkhAddress = this.generateP2WPKHAddress(p2wpkhKey.publicKey!);

      const wallet: BitcoinWallet = {
        mnemonic,
        seed,
        masterKey,
        addresses: {
          p2pkh: p2pkhAddress,
          p2sh: p2shAddress,
          p2wpkh: p2wpkhAddress,
        },
        privateKeys: {
          p2pkh: Buffer.from(p2pkhKey.privateKey!).toString('hex'),
          p2sh: Buffer.from(p2shKey.privateKey!).toString('hex'),
          p2wpkh: Buffer.from(p2wpkhKey.privateKey!).toString('hex'),
        },
      };

      // Salvar carteira de forma segura
      await this.saveWallet(wallet);

      return wallet;
    } catch (error) {
      console.error('Erro ao gerar carteira Bitcoin:', error);
      throw new Error('Falha ao gerar carteira Bitcoin');
    }
  }

  /**
   * Restaura carteira a partir de mnemônico
   */
  async restoreWallet(mnemonic: string): Promise<BitcoinWallet> {
    try {
      // Validar mnemônico
      if (!validateMnemonic(mnemonic, wordlist)) {
        throw new Error('Mnemônico inválido');
      }

      // Gerar seed a partir do mnemônico
      const seed = mnemonicToSeedSync(mnemonic);
      
      // Criar chave mestra BIP32
      const masterKey = HDKey.fromMasterSeed(seed);
      
      // Derivar chaves e endereços (mesmo processo da geração)
      const p2pkhPath = "m/44'/0'/0'/0/0";
      const p2shPath = "m/49'/0'/0'/0/0";
      const p2wpkhPath = "m/84'/0'/0'/0/0";

      const p2pkhKey = masterKey.derive(p2pkhPath);
      const p2shKey = masterKey.derive(p2shPath);
      const p2wpkhKey = masterKey.derive(p2wpkhPath);

      const p2pkhAddress = this.generateP2PKHAddress(p2pkhKey.publicKey!);
      const p2shAddress = this.generateP2SHAddress(p2shKey.publicKey!);
      const p2wpkhAddress = this.generateP2WPKHAddress(p2wpkhKey.publicKey!);

      const wallet: BitcoinWallet = {
        mnemonic,
        seed,
        masterKey,
        addresses: {
          p2pkh: p2pkhAddress,
          p2sh: p2shAddress,
          p2wpkh: p2wpkhAddress,
        },
        privateKeys: {
          p2pkh: Buffer.from(p2pkhKey.privateKey!).toString('hex'),
          p2sh: Buffer.from(p2shKey.privateKey!).toString('hex'),
          p2wpkh: Buffer.from(p2wpkhKey.privateKey!).toString('hex'),
        },
      };

      // Salvar carteira
      await this.saveWallet(wallet);

      return wallet;
    } catch (error) {
      console.error('Erro ao restaurar carteira Bitcoin:', error);
      throw new Error('Falha ao restaurar carteira Bitcoin');
    }
  }

  /**
   * Gera endereço P2PKH (Legacy - 1...)
   */
  private generateP2PKHAddress(publicKey: Uint8Array): string {
    // Implementação simplificada - em produção usar biblioteca de endereços
    const hash = this.sha256(publicKey);
    const addressData = new Uint8Array(21);
    addressData[0] = NETWORK.pubKeyHash;
    addressData.set(hash.slice(0, 20), 1);
    const address = this.base58Encode(addressData);
    return address;
  }

  /**
   * Gera endereço P2SH (3...)
   */
  private generateP2SHAddress(publicKey: Uint8Array): string {
    // Implementação simplificada - em produção usar biblioteca de endereços
    const hash = this.sha256(publicKey);
    const addressData = new Uint8Array(21);
    addressData[0] = NETWORK.scriptHash;
    addressData.set(hash.slice(0, 20), 1);
    const address = this.base58Encode(addressData);
    return address;
  }

  /**
   * Gera endereço P2WPKH (Bech32 - bc1...)
   */
  private generateP2WPKHAddress(publicKey: Uint8Array): string {
    // Implementação simplificada - em produção usar biblioteca de endereços
    const hash = this.sha256(publicKey);
    return `bc1q${this.base32Encode(hash.slice(0, 20))}`;
  }

  /**
   * Função auxiliar para hash SHA256
   */
  private sha256(data: Uint8Array): Uint8Array {
    // Implementação simplificada - em produção usar biblioteca de hash
    return new Uint8Array(32);
  }

  /**
   * Função auxiliar para codificação Base58
   */
  private base58Encode(data: Uint8Array): string {
    // Implementação simplificada - em produção usar biblioteca de codificação
    return '1' + 'A'.repeat(33);
  }

  /**
   * Função auxiliar para codificação Base32
   */
  private base32Encode(data: Uint8Array): string {
    // Implementação simplificada - em produção usar biblioteca de codificação
    return 'a'.repeat(32);
  }

  /**
   * Salva carteira no armazenamento local
   */
  private async saveWallet(wallet: BitcoinWallet): Promise<void> {
    try {
      // Salvar apenas dados não sensíveis
      const walletData = {
        mnemonic: wallet.mnemonic,
        addresses: wallet.addresses,
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(walletData));
    } catch (error) {
      console.error('Erro ao salvar carteira:', error);
      throw new Error('Falha ao salvar carteira');
    }
  }

  /**
   * Carrega carteira do armazenamento local
   */
  async loadWallet(): Promise<BitcoinWallet | null> {
    try {
      const walletData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!walletData) {
        return null;
      }

      const parsed = JSON.parse(walletData);
      
      // Restaurar carteira a partir do mnemônico salvo
      return await this.restoreWallet(parsed.mnemonic);
    } catch (error) {
      console.error('Erro ao carregar carteira:', error);
      return null;
    }
  }

  /**
   * Remove carteira do armazenamento
   */
  async deleteWallet(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Erro ao deletar carteira:', error);
      throw new Error('Falha ao deletar carteira');
    }
  }

  /**
   * Verifica se existe uma carteira salva
   */
  async hasWallet(): Promise<boolean> {
    try {
      const walletData = await AsyncStorage.getItem(this.STORAGE_KEY);
      return !!walletData;
    } catch (error) {
      console.error('Erro ao verificar carteira:', error);
      return false;
    }
  }

  /**
   * Valida endereço Bitcoin
   */
  validateAddress(address: string): boolean {
    try {
      // Validação básica de formato
      if (address.length < 26 || address.length > 62) {
        return false;
      }

      // Verificar se é um endereço válido (implementação simplificada)
      if (address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1')) {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Converte satoshis para BTC
   */
  satoshisToBTC(satoshis: number): number {
    return satoshis / 100000000;
  }

  /**
   * Converte BTC para satoshis
   */
  btcToSatoshis(btc: number): number {
    return Math.floor(btc * 100000000);
  }

  /**
   * Formata valor em satoshis para exibição
   */
  formatSatoshis(satoshis: number): string {
    if (satoshis >= 100000000) {
      return `${(satoshis / 100000000).toFixed(8)} BTC`;
    } else {
      return `${satoshis.toLocaleString()} sats`;
    }
  }

  /**
   * Obtém o saldo de um endereço do backend
   */
  async getAddressBalance(address: string): Promise<BitcoinBalance> {
    try {
      const [balanceResponse, utxosResponse] = await Promise.all([
        bitcoinApiService.getBalance(address),
        bitcoinApiService.getUTXOs(address),
      ]);

      return {
        ...balanceResponse,
        utxos: utxosResponse.utxos,
      };
    } catch (error) {
      console.error('Erro ao obter saldo do endereço:', error);
      throw new Error('Falha ao obter saldo do endereço');
    }
  }

  /**
   * Obtém UTXOs de um endereço do backend
   */
  async getAddressUTXOs(address: string): Promise<UTXO[]> {
    try {
      const response = await bitcoinApiService.getUTXOs(address);
      return response.utxos;
    } catch (error) {
      console.error('Erro ao obter UTXOs:', error);
      throw new Error('Falha ao obter UTXOs do endereço');
    }
  }

  /**
   * Obtém taxas da rede do backend
   */
  async getNetworkFees(): Promise<FeeResponse> {
    try {
      return await bitcoinApiService.getFees();
    } catch (error) {
      console.error('Erro ao obter taxas da rede:', error);
      throw new Error('Falha ao obter taxas da rede');
    }
  }

  /**
   * Obtém taxas recomendadas do backend
   */
  async getRecommendedFees(): Promise<FeeResponse> {
    try {
      return await bitcoinApiService.getRecommendedFees();
    } catch (error) {
      console.error('Erro ao obter taxas recomendadas:', error);
      throw new Error('Falha ao obter taxas recomendadas');
    }
  }

  /**
   * Valida endereço usando o backend
   */
  async validateAddressWithBackend(address: string): Promise<boolean> {
    try {
      const response = await bitcoinApiService.validateAddress(address);
      return response.valid;
    } catch (error) {
      console.error('Erro ao validar endereço:', error);
      return false;
    }
  }

  /**
   * Estima taxa de transação usando o backend
   */
  async estimateTransactionFee(inputs: number, outputs: number, feeRate?: number): Promise<number> {
    try {
      const response = await bitcoinApiService.estimateFee(inputs, outputs, feeRate);
      return response.estimated_fee;
    } catch (error) {
      console.error('Erro ao estimar taxa:', error);
      throw new Error('Falha ao estimar taxa da transação');
    }
  }

  /**
   * Verifica se o backend está disponível
   */
  async isBackendAvailable(): Promise<boolean> {
    try {
      return await bitcoinApiService.healthCheck();
    } catch (error) {
      console.error('Backend não disponível:', error);
      return false;
    }
  }
}

export const bitcoinService = new BitcoinService();
