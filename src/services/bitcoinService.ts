// src/services/bitcoinService.ts

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { HDKey } from "@scure/bip32";
import * as secp from "@noble/secp256k1";
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BitcoinWallet {
  mnemonic: string;
  seed: Uint8Array;
  root: HDKey;
  addresses: {
    p2pkh: string;  // Legacy (1...)
    p2sh: string;   // P2SH (3...)
    bech32: string; // Native SegWit (bc1...)
  };
}

export interface BitcoinKey {
  path: string;
  privateKey: string;
  publicKey: string;
  address: string;
}

export class BitcoinService {
  private readonly STORAGE_KEY = 'bitcoin_wallet';

  mnemonic: string | null = null;
  seed: Uint8Array | null = null;
  root: HDKey | null = null;

  // cria uma nova mnemonic de 12 palavras
  createMnemonic(): string {
    this.mnemonic = generateMnemonic(wordlist, 128); // 128 bits = 12 palavras
    return this.mnemonic;
  }

  // importa mnemonic existente
  loadMnemonic(mnemonic: string): void {
    if (!validateMnemonic(mnemonic, wordlist)) {
      throw new Error("Mnemonic inválida");
    }
    this.mnemonic = mnemonic;
  }

  // inicializa seed e HDKey
  initWallet(): void {
    console.log("🔍 [DEBUG] initWallet - mnemonic:", this.mnemonic);
    if (!this.mnemonic) {
      throw new Error("Nenhuma mnemonic carregada");
    }
    this.seed = mnemonicToSeedSync(this.mnemonic);
    console.log("🔍 [DEBUG] initWallet - seed:", this.seed);
    console.log("🔍 [DEBUG] initWallet - seed length:", this.seed?.length);
    this.root = HDKey.fromMasterSeed(this.seed);
    console.log("🔍 [DEBUG] initWallet - root:", this.root);
  }

  // deriva chave para path padrão BIP44 (exemplo Bitcoin: m/44'/0'/0'/0/0)
  getKey(path = "m/44'/0'/0'/0/0"): BitcoinKey {
    if (!this.root) {
      throw new Error("Wallet não inicializada");
    }
    const child = this.root.derive(path);
    if (!child.privateKey) {
      throw new Error("Falha ao derivar chave privada");
    }
    const publicKey = secp.getPublicKey(child.privateKey, true); // compressed
    
    // Gerar endereço Bitcoin (simplificado - você pode usar bitcoinjs-lib para endereços completos)
    const address = this.generateAddress(publicKey);
    
    return {
      path,
      privateKey: Buffer.from(child.privateKey).toString("hex"),
      publicKey: Buffer.from(publicKey).toString("hex"),
      address,
    };
  }

  // Gera endereço Bitcoin (versão simplificada)
  private generateAddress(publicKey: Uint8Array): string {
    // Esta é uma implementação simplificada
    // Para produção, use bitcoinjs-lib para gerar endereços corretos
    // Usar apenas os primeiros 20 bytes da chave pública como endereço simplificado
    const address = Buffer.from(publicKey.slice(0, 20)).toString('hex');
    return `1${address.slice(0, 25)}`; // Endereço Legacy simplificado
  }

  // Salva carteira no AsyncStorage
  async saveWallet(): Promise<void> {
    if (!this.mnemonic || !this.seed || !this.root) {
      throw new Error("Nenhuma carteira para salvar");
    }

    const walletData = {
      mnemonic: this.mnemonic,
      seed: Array.from(this.seed), // Converter Uint8Array para Array para JSON
    };

    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(walletData));
  }

  // Carrega carteira do AsyncStorage
  async loadWallet(): Promise<BitcoinWallet | null> {
    try {
      const walletData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!walletData) {
        return null;
      }

      const parsed = JSON.parse(walletData);
      this.mnemonic = parsed.mnemonic;
      this.seed = new Uint8Array(parsed.seed);
      
      // Validar seed antes de criar HDKey
      if (!this.seed || this.seed.length === 0) {
        console.error('❌ Seed vazio ou inválido no AsyncStorage - limpando dados corrompidos');
        // Limpar dados corrompidos
        await AsyncStorage.removeItem(this.STORAGE_KEY);
        return null;
      }
      
      this.root = HDKey.fromMasterSeed(this.seed);

      // Gerar endereços
      const key = this.getKey();
      
      const wallet: BitcoinWallet = {
        mnemonic: this.mnemonic!,
        seed: this.seed,
        root: this.root,
        addresses: {
          p2pkh: key.address,
          p2sh: key.address, // Simplificado
          bech32: key.address, // Simplificado
        },
      };

      return wallet;
    } catch (error) {
      console.error('Erro ao carregar carteira:', error);
      return null;
    }
  }

  // Verifica se existe uma carteira salva
  async hasWallet(): Promise<boolean> {
    const walletData = await AsyncStorage.getItem(this.STORAGE_KEY);
    return walletData !== null;
  }

  // Deleta a carteira salva
  async deleteWallet(): Promise<void> {
    await AsyncStorage.removeItem(this.STORAGE_KEY);
    this.mnemonic = null;
    this.seed = null;
    this.root = null;
  }

  // Gera uma nova carteira completa
  async generateWallet(): Promise<BitcoinWallet> {
    try {
      console.log('🔍 [DEBUG] Gerando nova carteira Bitcoin...');
      
      // Criar mnemonic
      const mnemonic = this.createMnemonic();
      console.log('✅ Mnemonic gerado:', mnemonic);
      
      // Inicializar carteira
      this.initWallet();
      
      // Gerar chave principal
      const key = this.getKey();

      const wallet: BitcoinWallet = {
        mnemonic,
        seed: this.seed!,
        root: this.root!,
        addresses: {
          p2pkh: key.address,
          p2sh: key.address,
          bech32: key.address,
        },
      };

      // Salvar carteira
      await this.saveWallet();
      
      console.log('✅ Carteira gerada com sucesso');
      return wallet;
    } catch (error) {
      console.error('Erro ao gerar carteira Bitcoin:', error);
      throw new Error('Falha ao gerar carteira Bitcoin');
    }
  }

  // Restaura carteira a partir de mnemonic
  async restoreWallet(mnemonic: string): Promise<BitcoinWallet> {
    try {
      console.log('🔍 [DEBUG] Restaurando carteira com mnemonic...');
      
      // Carregar mnemonic
      this.loadMnemonic(mnemonic);
      
      // Inicializar carteira
      this.initWallet();
      
      // Gerar chave principal
      const key = this.getKey();

      const wallet: BitcoinWallet = {
        mnemonic,
        seed: this.seed!,
        root: this.root!,
        addresses: {
          p2pkh: key.address,
          p2sh: key.address,
          bech32: key.address,
        },
      };

      // Salvar carteira
      await this.saveWallet();

      console.log('✅ Carteira restaurada com sucesso');
      return wallet;
    } catch (error) {
      console.error('Erro ao restaurar carteira Bitcoin:', error);
      throw new Error('Falha ao restaurar carteira Bitcoin');
    }
  }

  // Métodos de formatação e utilidades
  formatSatoshis(sats: number): string {
    return sats.toLocaleString('pt-BR');
  }

  // Métodos do backend (implementações básicas)
  async isBackendAvailable(): Promise<boolean> {
    // Implementação básica - sempre retorna true para desenvolvimento
    return true;
  }

  async getAddressBalance(address: string): Promise<{ balance: number }> {
    // Implementação básica - retorna saldo zero para desenvolvimento
    console.log('🔍 [DEBUG] getAddressBalance chamado para:', address);
    return { balance: 0 };
  }

  async getNetworkFees(): Promise<{ economy_fee: number; hour_fee: number; fastest_fee: number }> {
    // Implementação básica - retorna taxas padrão
    return {
      economy_fee: 1,
      hour_fee: 5,
      fastest_fee: 10
    };
  }

  async sendTransaction(fromAddress: string, toAddress: string, amount: number, feeRate: number): Promise<string> {
    // Implementação básica - retorna um txid fake para desenvolvimento
    console.log('🔍 [DEBUG] sendTransaction chamado:', { fromAddress, toAddress, amount, feeRate });
    return 'fake-txid-' + Date.now();
  }

  validateAddress(address: string): boolean {
    // Implementação básica - validação simples de endereço Bitcoin
    return address.length > 20 && (address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1'));
  }
}

// Lazy initialization para evitar problemas de inicialização
let _bitcoinService: BitcoinService | null = null;

export const bitcoinService = {
  get instance(): BitcoinService {
    if (!_bitcoinService) {
      _bitcoinService = new BitcoinService();
    }
    return _bitcoinService;
  }
};

// Para compatibilidade com código existente
export const getBitcoinService = () => bitcoinService.instance;
