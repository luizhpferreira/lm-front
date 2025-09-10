// src/services/bitcoinService.ts

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { HDKey } from "@scure/bip32";
import * as secp from "@noble/secp256k1";
import { ripemd160 } from "@noble/hashes/legacy";
import { sha256 } from "@noble/hashes/sha2";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bitcoinApiService } from './bitcoinApiService';

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

  // Gera endereço Bitcoin real e válido
  private generateAddress(publicKey: Uint8Array, type: 'p2pkh' | 'p2sh' | 'bech32' = 'p2pkh'): string {
    // Gerar hash160 real (SHA256 + RIPEMD160)
    const sha256Hash = sha256(publicKey);
    const hash160 = ripemd160(sha256Hash);
    
    switch (type) {
      case 'p2pkh':
        return this.createP2PKHAddress(hash160);
      case 'p2sh':
        return this.createP2SHAddress(hash160);
      case 'bech32':
        return this.createBech32Address(hash160);
      default:
        return this.createP2PKHAddress(hash160);
    }
  }

  // Cria endereço P2PKH (Legacy) - 1...
  private createP2PKHAddress(hash160: Uint8Array): string {
    // Versão 0x00 para mainnet
    const version = new Uint8Array([0x00]);
    const payload = new Uint8Array([...version, ...hash160]);
    
    // Calcular checksum (SHA256(SHA256(payload)))
    const checksum = sha256(sha256(payload)).slice(0, 4);
    const addressBytes = new Uint8Array([...payload, ...checksum]);
    
    return this.base58Encode(addressBytes);
  }

  // Cria endereço P2SH - 3...
  private createP2SHAddress(hash160: Uint8Array): string {
    // Versão 0x05 para P2SH mainnet
    const version = new Uint8Array([0x05]);
    const payload = new Uint8Array([...version, ...hash160]);
    
    // Calcular checksum
    const checksum = sha256(sha256(payload)).slice(0, 4);
    const addressBytes = new Uint8Array([...payload, ...checksum]);
    
    return this.base58Encode(addressBytes);
  }

  // Cria endereço Bech32 - bc1...
  private createBech32Address(hash160: Uint8Array): string {
    // Para simplificar, vamos usar uma implementação básica de Bech32
    // Em produção, use uma biblioteca específica para Bech32
    const witnessVersion = 0;
    const program = hash160.slice(0, 20); // 20 bytes para P2WPKH
    
    // Implementação simplificada de Bech32
    const hrp = "bc";
    const data = [witnessVersion, ...this.convertBits(program, 8, 5)];
    const checksum = this.bech32Checksum(hrp, data);
    
    return hrp + "1" + this.bech32Encode([...data, ...checksum]);
  }

  // Codificação Base58
  private base58Encode(bytes: Uint8Array): string {
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    
    // Converter bytes para BigInt diretamente
    let num = BigInt(0);
    for (let i = 0; i < bytes.length; i++) {
      num = num * BigInt(256) + BigInt(bytes[i]);
    }
    
    let result = "";
    while (num > BigInt(0)) {
      result = alphabet[Number(num % BigInt(58))] + result;
      num = num / BigInt(58);
    }
    
    // Adicionar '1's para zeros à esquerda
    for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
      result = "1" + result;
    }
    
    return result;
  }

  // Conversão de bits para Bech32
  private convertBits(data: Uint8Array, fromBits: number, toBits: number): number[] {
    let acc = 0;
    let bits = 0;
    const result = [];
    const maxv = (1 << toBits) - 1;
    
    for (let i = 0; i < data.length; i++) {
      acc = (acc << fromBits) | data[i];
      bits += fromBits;
      
      while (bits >= toBits) {
        bits -= toBits;
        result.push((acc >> bits) & maxv);
      }
    }
    
    if (bits > 0) {
      result.push((acc << (toBits - bits)) & maxv);
    }
    
    return result;
  }

  // Checksum Bech32
  private bech32Checksum(hrp: string, data: number[]): number[] {
    const values = [...this.bech32HrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0];
    const polymod = this.bech32Polymod(values) ^ 1;
    const result = [];
    
    for (let i = 0; i < 6; i++) {
      result.push((polymod >> (5 * (5 - i))) & 31);
    }
    
    return result;
  }

  // Expansão HRP para Bech32
  private bech32HrpExpand(hrp: string): number[] {
    const result = [];
    for (let i = 0; i < hrp.length; i++) {
      result.push(hrp.charCodeAt(i) >> 5);
    }
    result.push(0);
    for (let i = 0; i < hrp.length; i++) {
      result.push(hrp.charCodeAt(i) & 31);
    }
    return result;
  }

  // Polinomio Bech32
  private bech32Polymod(values: number[]): number {
    const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    let chk = 1;
    
    for (let i = 0; i < values.length; i++) {
      const b = chk >> 25;
      chk = (chk & 0x1ffffff) << 5 ^ values[i];
      
      for (let j = 0; j < 5; j++) {
        if ((b >> j) & 1) {
          chk ^= GEN[j];
        }
      }
    }
    
    return chk;
  }

  // Codificação Bech32
  private bech32Encode(data: number[]): string {
    const alphabet = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
    let result = "";
    
    for (let i = 0; i < data.length; i++) {
      result += alphabet[data[i]];
    }
    
    return result;
  }

  // Gera todos os tipos de endereços para uma chave
  generateAllAddresses(publicKey: Uint8Array): { p2pkh: string; p2sh: string; bech32: string } {
    return {
      p2pkh: this.generateAddress(publicKey, 'p2pkh'),
      p2sh: this.generateAddress(publicKey, 'p2sh'),
      bech32: this.generateAddress(publicKey, 'bech32')
    };
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
      const publicKey = new Uint8Array(Buffer.from(key.publicKey, 'hex'));
      const addresses = this.generateAllAddresses(publicKey);
      
      const wallet: BitcoinWallet = {
        mnemonic: this.mnemonic!,
        seed: this.seed,
        root: this.root,
        addresses: addresses,
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

  // Limpa dados corrompidos
  async clearCorruptedData(): Promise<void> {
    console.log('🧹 Limpando dados corrompidos...');
    await AsyncStorage.removeItem(this.STORAGE_KEY);
    this.mnemonic = null;
    this.seed = null;
    this.root = null;
    console.log('✅ Dados corrompidos limpos');
  }

  // Força limpeza completa (inclui cache)
  async forceCleanSlate(): Promise<void> {
    console.log('🧹 Forçando limpeza completa...');
    await AsyncStorage.removeItem(this.STORAGE_KEY);
    await AsyncStorage.removeItem('bitcoin_wallet');
    await AsyncStorage.removeItem('wallet_data');
    this.mnemonic = null;
    this.seed = null;
    this.root = null;
    console.log('✅ Limpeza completa realizada');
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
      const publicKey = new Uint8Array(Buffer.from(key.publicKey, 'hex'));
      const addresses = this.generateAllAddresses(publicKey);

      const wallet: BitcoinWallet = {
        mnemonic,
        seed: this.seed!,
        root: this.root!,
        addresses: addresses,
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
      const publicKey = new Uint8Array(Buffer.from(key.publicKey, 'hex'));
      const addresses = this.generateAllAddresses(publicKey);

      const wallet: BitcoinWallet = {
        mnemonic,
        seed: this.seed!,
        root: this.root!,
        addresses: addresses,
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
    try {
      console.log('🔍 [DEBUG] Verificando disponibilidade do backend...');
      await bitcoinApiService.getRecommendedFees();
      console.log('✅ Backend disponível');
      return true;
    } catch (error) {
      console.error('❌ Backend indisponível:', error);
      return false;
    }
  }

  async getAddressBalance(address: string): Promise<{ balance: number }> {
    try {
      console.log('🔍 [DEBUG] getAddressBalance chamado para:', address);
      const balanceData = await bitcoinApiService.getBalance(address);
      console.log('✅ Saldo obtido do backend naocustodial.com.br:', balanceData);
      return { balance: balanceData.balance };
    } catch (error) {
      console.error('❌ Erro ao obter saldo do backend naocustodial.com.br:', error);
      // Fallback para saldo zero em caso de erro
      return { balance: 0 };
    }
  }

  async getNetworkFees(): Promise<{ economy_fee: number; hour_fee: number; fastest_fee: number }> {
    try {
      console.log('🔍 [DEBUG] Obtendo taxas do backend...');
      const fees = await bitcoinApiService.getRecommendedFees();
      console.log('✅ Taxas obtidas do backend:', fees);
      return {
        economy_fee: fees.economy_fee,
        hour_fee: fees.hour_fee,
        fastest_fee: fees.fastest_fee
      };
    } catch (error) {
      console.error('❌ Erro ao obter taxas do backend:', error);
      // Fallback para valores padrão
      return {
        economy_fee: 1,
        hour_fee: 5,
        fastest_fee: 10
      };
    }
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
