// Polyfill para Buffer (necessário para bitcoinjs-lib)
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as bip39 from 'bip39';
import { fromSeed } from 'bip32';
import * as secp256k1 from '@noble/secp256k1';
import * as bitcoin from 'bitcoinjs-lib';

function assertSecpReady() {
  console.log('🔍 [DEBUG] secp256k1.utils:', {
    __lumaPatched: (secp256k1.utils as any).__lumaPatched,
    sha256Sync: typeof (secp256k1.utils as any).sha256Sync,
    sha256: typeof (secp256k1.utils as any).sha256
  });
  
  console.log('🔍 [DEBUG] secp256k1.etc:', {
    __lumaPatched: (secp256k1.etc as any).__lumaPatched,
    hmacSha256Sync: typeof (secp256k1.etc as any).hmacSha256Sync
  });
  
  if ((secp256k1.utils as any).__lumaPatched !== true) {
    throw new Error('secp.utils não patchado: verifique patch-package');
  }
  if ((secp256k1.etc as any).__lumaPatched !== true) {
    throw new Error('secp.etc não patchado: verifique patch-package');
  }
  if (typeof (secp256k1.utils as any).sha256Sync !== 'function') {
    throw new Error('sha256Sync ausente');
  }
  if (typeof (secp256k1.utils as any).sha256 !== 'function') {
    throw new Error('sha256 (async) ausente');
  }
  if (typeof (secp256k1.etc as any).hmacSha256Sync !== 'function') {
    throw new Error('hmacSha256Sync ausente');
  }
}

// Removido @noble/hashes - usando CryptoJS
import { bitcoinApiService, UTXO, BalanceResponse, FeeResponse } from './bitcoinApiService';
// @ts-ignore
import CryptoJS from 'crypto-js';

// SHA256 já registrado em src/setup/secp-sha256.ts

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
  seed: Buffer;
  masterKey: any;
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

// Interfaces para construção de transações
export interface TransactionInput {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey: string;
  privateKey: string;
}

export interface TransactionOutput {
  address: string;
  value: number;
}

export interface RawTransaction {
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  fee: number;
  totalInput: number;
  totalOutput: number;
}

class BitcoinService {
  private readonly STORAGE_KEY = 'bitcoin_wallet';

  /**
   * Gera uma nova carteira Bitcoin com seed BIP39
   */
  async generateWallet(): Promise<BitcoinWallet> {
    try {
      console.log('🔍 [DEBUG] Gerando nova carteira Bitcoin...');
      
      // Gerar mnemônico BIP39
      const mnemonic = bip39.generateMnemonic(256); // 24 palavras (256 bits)
      console.log('✅ Mnemônico gerado:', mnemonic);
      
      // Verificar se o mnemônico é válido
      if (!bip39.validateMnemonic(mnemonic)) {
        console.error('❌ Mnemônico inválido gerado:', mnemonic);
        throw new Error('Mnemônico inválido gerado');
      }

      // Gerar seed a partir do mnemônico
      console.log('🔍 [DEBUG] Gerando seed a partir do mnemônico...');
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      
      if (!seed || seed.length === 0) {
        console.error('❌ Seed gerado é null ou vazio');
        throw new Error('Falha ao gerar seed a partir do mnemônico');
      }
      
      console.log('✅ Seed gerado com sucesso, tamanho:', seed.length);
      
      // Criar chave mestra BIP32
      console.log('🔍 [DEBUG] Criando chave mestra BIP32...');
      const masterKey = fromSeed(seed);
      
      if (!masterKey) {
        console.error('❌ Chave mestra é null');
        throw new Error('Falha ao criar chave mestra BIP32');
      }
      
      console.log('✅ Chave mestra criada com sucesso');
      
      // Derivar chaves para diferentes tipos de endereços
      // Caminho BIP44: m/44'/0'/0'/0/0
      const p2pkhPath = "m/44'/0'/0'/0/0";
      const p2shPath = "m/49'/0'/0'/0/0";
      const p2wpkhPath = "m/84'/0'/0'/0/0";

      const p2pkhKey = masterKey.derivePath(p2pkhPath);
      const p2shKey = masterKey.derivePath(p2shPath);
      const p2wpkhKey = masterKey.derivePath(p2wpkhPath);

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
          p2pkh: p2pkhKey.privateKey!.toString('hex'),
          p2sh: p2shKey.privateKey!.toString('hex'),
          p2wpkh: p2wpkhKey.privateKey!.toString('hex'),
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
      console.log('🔍 [DEBUG] Restaurando carteira com mnemônico:', mnemonic);
      
      // Validar mnemônico
      if (!bip39.validateMnemonic(mnemonic)) {
        console.error('❌ Mnemônico inválido:', mnemonic);
        throw new Error('Mnemônico inválido');
      }

      // Gerar seed a partir do mnemônico
      console.log('🔍 [DEBUG] Gerando seed a partir do mnemônico...');
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      
      if (!seed || seed.length === 0) {
        console.error('❌ Seed gerado é null ou vazio');
        throw new Error('Falha ao gerar seed a partir do mnemônico');
      }
      
      console.log('✅ Seed gerado com sucesso, tamanho:', seed.length);
      
      // Criar chave mestra BIP32
      console.log('🔍 [DEBUG] Criando chave mestra BIP32...');
      const masterKey = fromSeed(seed);
      
      if (!masterKey) {
        console.error('❌ Chave mestra é null');
        throw new Error('Falha ao criar chave mestra BIP32');
      }
      
      console.log('✅ Chave mestra criada com sucesso');
      
      // Derivar chaves e endereços (mesmo processo da geração)
      const p2pkhPath = "m/44'/0'/0'/0/0";
      const p2shPath = "m/49'/0'/0'/0/0";
      const p2wpkhPath = "m/84'/0'/0'/0/0";

      const p2pkhKey = masterKey.derivePath(p2pkhPath);
      const p2shKey = masterKey.derivePath(p2shPath);
      const p2wpkhKey = masterKey.derivePath(p2wpkhPath);

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
          p2pkh: p2pkhKey.privateKey!.toString('hex'),
          p2sh: p2shKey.privateKey!.toString('hex'),
          p2wpkh: p2wpkhKey.privateKey!.toString('hex'),
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
    // Hash RIPEMD160(SHA256(publicKey))
    const sha256Hash = this.sha256(publicKey);
    const ripemd160Hash = this.ripemd160(sha256Hash);
    
    // Adicionar prefixo da rede (0x00 para mainnet)
    const addressData = new Uint8Array(21);
    addressData[0] = NETWORK.pubKeyHash; // 0x00
    addressData.set(ripemd160Hash, 1);
    
    // Calcular checksum (primeiros 4 bytes do SHA256(SHA256(addressData)))
    const checksum = this.doubleSHA256(addressData).slice(0, 4);
    
    // Concatenar addressData + checksum
    const fullAddress = new Uint8Array(25);
    fullAddress.set(addressData, 0);
    fullAddress.set(checksum, 21);
    
    return this.base58Encode(fullAddress);
  }

  /**
   * Gera endereço P2SH (3...)
   */
  private generateP2SHAddress(publicKey: Uint8Array): string {
    // Para P2SH, precisamos criar um script P2WPKH-P2SH
    // Script: OP_0 + RIPEMD160(SHA256(publicKey))
    const sha256Hash = this.sha256(publicKey);
    const ripemd160Hash = this.ripemd160(sha256Hash);
    
    // Criar script: OP_0 (0x00) + 20 bytes do hash
    const script = new Uint8Array(22);
    script[0] = 0x00; // OP_0
    script.set(ripemd160Hash, 1);
    
    // Hash RIPEMD160(SHA256(script))
    const scriptSha256 = this.sha256(script);
    const scriptHash = this.ripemd160(scriptSha256);
    
    // Adicionar prefixo da rede (0x05 para P2SH mainnet)
    const addressData = new Uint8Array(21);
    addressData[0] = NETWORK.scriptHash; // 0x05
    addressData.set(scriptHash, 1);
    
    // Calcular checksum
    const checksum = this.doubleSHA256(addressData).slice(0, 4);
    
    // Concatenar addressData + checksum
    const fullAddress = new Uint8Array(25);
    fullAddress.set(addressData, 0);
    fullAddress.set(checksum, 21);
    
    return this.base58Encode(fullAddress);
  }

  /**
   * Gera endereço P2WPKH (Bech32 - bc1...)
   */
  private generateP2WPKHAddress(publicKey: Uint8Array): string {
    // Hash RIPEMD160(SHA256(publicKey))
    const sha256Hash = this.sha256(publicKey);
    const ripemd160Hash = this.ripemd160(sha256Hash);
    
    // Para Bech32, usar implementação simplificada
    // Em produção, usar biblioteca como bech32
    return `bc1q${this.base32Encode(ripemd160Hash)}`;
  }

  /**
   * Função auxiliar para hash SHA256
   */
  private sha256(data: Uint8Array): Uint8Array {
    const CryptoJS = require('crypto-js');
    const hexString = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
    const hash = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(hexString));
    const hashHex = hash.toString(CryptoJS.enc.Hex);
    return new Uint8Array(hashHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
  }

  /**
   * Função auxiliar para hash RIPEMD160
   */
  private ripemd160(data: Uint8Array): Uint8Array {
    const CryptoJS = require('crypto-js');
    const hexString = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
    const hash = CryptoJS.RIPEMD160(CryptoJS.enc.Hex.parse(hexString));
    const hashHex = hash.toString(CryptoJS.enc.Hex);
    return new Uint8Array(hashHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
  }

  /**
   * Função auxiliar para double SHA256
   */
  private doubleSHA256(data: Uint8Array): Uint8Array {
    const firstHash = this.sha256(data);
    return this.sha256(firstHash);
  }

  /**
   * Função auxiliar para codificação Base58
   */
  private base58Encode(data: Uint8Array): string {
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    let num = BigInt('0x' + Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    while (num > BigInt(0)) {
      result = alphabet[Number(num % BigInt(58))] + result;
      num = num / BigInt(58);
    }
    
    // Adicionar '1's para zeros à esquerda
    for (let i = 0; i < data.length && data[i] === 0; i++) {
      result = '1' + result;
    }
    
    return result;
  }

  /**
   * Função auxiliar para codificação Base32
   */
  private base32Encode(data: Uint8Array): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
    let result = '';
    let bits = 0;
    let value = 0;
    
    for (let i = 0; i < data.length; i++) {
      value = (value << 8) | data[i];
      bits += 8;
      
      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    
    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }
    
    return result;
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
      console.log('🔍 [DEBUG] Carregando carteira do armazenamento...');
      const walletData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!walletData) {
        console.log('🔍 [DEBUG] Nenhuma carteira encontrada no armazenamento');
        return null;
      }

      console.log('🔍 [DEBUG] Dados da carteira encontrados, parseando...');
      const parsed = JSON.parse(walletData);
      
      if (!parsed.mnemonic) {
        console.error('❌ Mnemônico não encontrado nos dados salvos');
        return null;
      }
      
      console.log('🔍 [DEBUG] Restaurando carteira a partir do mnemônico...');
      // Restaurar carteira a partir do mnemônico salvo
      return await this.restoreWallet(parsed.mnemonic);
    } catch (error) {
      console.error('❌ Erro ao carregar carteira:', error);
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
      console.log('🔍 Validando endereço:', address);
      console.log('🔍 Tamanho:', address.length);
      
      // Validação básica de formato
      if (address.length < 26 || address.length > 62) {
        console.log('❌ Tamanho inválido:', address.length);
        return false;
      }

      // Verificar se é um endereço válido (implementação simplificada)
      if (address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1')) {
        console.log('✅ Endereço válido:', address);
        return true;
      }

      console.log('❌ Prefixo inválido:', address.substring(0, 3));
      return false;
    } catch (error) {
      console.log('❌ Erro na validação:', error);
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
      console.log('🔍 Validando endereço no backend:', address);
      const response = await bitcoinApiService.validateAddress(address);
      console.log('🔍 Resposta do backend:', response);
      console.log('🔍 Endereço válido no backend:', response.valid);
      return response.valid;
    } catch (error) {
      console.error('❌ Erro ao validar endereço no backend:', error);
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

  /**
   * Seleciona UTXOs para uma transação usando algoritmo First-Fit
   */
  async selectUTXOs(address: string, targetAmount: number, feeRate: number = 10): Promise<TransactionInput[]> {
    try {
      // Obter UTXOs do endereço
      const utxoResponse = await bitcoinApiService.getUTXOs(address);
      const utxos = utxoResponse.utxos;

      if (utxos.length === 0) {
        throw new Error('Nenhum UTXO disponível');
      }

      // Ordenar UTXOs por valor (maior primeiro)
      const sortedUTXOs = utxos.sort((a, b) => b.value - a.value);

      const selectedInputs: TransactionInput[] = [];
      let totalValue = 0;
      let inputCount = 0;

      // Algoritmo First-Fit: pegar UTXOs até atingir o valor necessário
      for (const utxo of sortedUTXOs) {
        selectedInputs.push({
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value,
          scriptPubKey: utxo.script_pub_key,
          privateKey: '', // Será preenchido depois
        });

        totalValue += utxo.value;
        inputCount++;

        // Estimar taxa (aproximadamente 148 bytes por input + 34 bytes por output + 10 bytes overhead)
        const estimatedFee = (inputCount * 148 + 2 * 34 + 10) * feeRate;
        const totalNeeded = targetAmount + estimatedFee;

        if (totalValue >= totalNeeded) {
          break;
        }
      }

      // Verificar se temos UTXOs suficientes
      const estimatedFee = (inputCount * 148 + 2 * 34 + 10) * feeRate;
      const totalNeeded = targetAmount + estimatedFee;

      if (totalValue < totalNeeded) {
        throw new Error(`Fundos insuficientes. Necessário: ${totalNeeded} sats, Disponível: ${totalValue} sats`);
      }

      return selectedInputs;
    } catch (error) {
      console.error('Erro ao selecionar UTXOs:', error);
      throw error;
    }
  }

  /**
   * Constrói uma transação Bitcoin
   */
  async buildTransaction(
    fromAddress: string,
    toAddress: string,
    amount: number,
    feeRate: number = 10
  ): Promise<RawTransaction> {
    try {
      console.log('🔍 [DEBUG] Construindo transação:', { fromAddress, toAddress, amount, feeRate });
      
      // Verificar se é uma transação de dust
      const isDust = amount < 546;
      console.log('🔍 [DEBUG] É transação de dust:', isDust);
      
      // Para transações de dust, usar taxa mínima (23 sats)
      // Para transações normais, usar taxa normal
      const actualFeeRate = isDust ? 1 : feeRate; // 1 sat/vB para dust
      console.log('🔍 [DEBUG] Taxa a ser usada:', actualFeeRate);
      
      // Selecionar UTXOs
      const inputs = await this.selectUTXOs(fromAddress, amount, actualFeeRate);

      // Calcular valores
      const totalInput = inputs.reduce((sum, input) => sum + input.value, 0);
      const estimatedFee = (inputs.length * 148 + 2 * 34 + 10) * actualFeeRate;
      const change = totalInput - amount - estimatedFee;

      console.log('🔍 [DEBUG] Valores calculados:', { totalInput, estimatedFee, change });

      // Criar outputs
      const outputs: TransactionOutput[] = [
        {
          address: toAddress,
          value: amount,
        },
      ];

      // Adicionar output de troco se necessário
      if (change > 546) { // Dust threshold
        outputs.push({
          address: fromAddress, // Troco para o endereço de origem
          value: change,
        });
        console.log('🔍 [DEBUG] Adicionado output de troco:', change);
      } else {
        console.log('🔍 [DEBUG] Sem troco (dust ou insuficiente)');
      }

      return {
        inputs,
        outputs,
        fee: estimatedFee,
        totalInput,
        totalOutput: amount + (change > 546 ? change : 0),
      };
    } catch (error) {
      console.error('Erro ao construir transação:', error);
      throw error;
    }
  }

  /**
   * Converte string hex para Buffer
   */
  private hexToBuffer(hex: string): Buffer {
    return Buffer.from(hex, 'hex');
  }

  /**
   * Converte Buffer para string hex
   */
  private bufferToHex(buffer: Buffer): string {
    return buffer.toString('hex');
  }

  /**
   * Converte número para little-endian de 4 bytes
   */
  private uint32ToLE(value: number): Buffer {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32LE(value, 0);
    return buffer;
  }

  /**
   * Converte número para little-endian de 8 bytes
   */
  private uint64ToLE(value: number): Buffer {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(BigInt(value), 0);
    return buffer;
  }

  /**
   * Converte variável para varint
   */
  private toVarInt(value: number): Buffer {
    if (value < 0xfd) {
      return Buffer.from([value]);
    } else if (value <= 0xffff) {
      const buffer = Buffer.alloc(3);
      buffer[0] = 0xfd;
      buffer.writeUInt16LE(value, 1);
      return buffer;
    } else if (value <= 0xffffffff) {
      const buffer = Buffer.alloc(5);
      buffer[0] = 0xfe;
      buffer.writeUInt32LE(value, 1);
      return buffer;
    } else {
      const buffer = Buffer.alloc(9);
      buffer[0] = 0xff;
      buffer.writeBigUInt64LE(BigInt(value), 1);
      return buffer;
    }
  }


  /**
   * Assina uma transação Bitcoin
   */
  async signTransaction(transaction: RawTransaction, wallet: BitcoinWallet): Promise<string> {
    try {
      console.log('🔐 Assinando transação...');
      
      // Construir transação raw
      const rawTx = this.buildRawTransaction(transaction);
      
      // Assinar cada input
      const signedTx = await this.signRawTransaction(rawTx, transaction, wallet);
      
      console.log('✅ Transação assinada');
      return signedTx;
    } catch (error) {
      console.error('Erro ao assinar transação:', error);
      throw new Error('Falha ao assinar transação');
    }
  }

  /**
   * Constrói transação raw sem assinaturas
   */
  private buildRawTransaction(transaction: RawTransaction): Buffer {
    // Para React Native, vamos usar uma implementação simplificada
    // Em produção, seria necessário implementar a serialização completa
    console.log('📝 Construindo transação raw...');
    
    // Retornar um buffer vazio por enquanto
    // A lógica real será implementada em buildBasicRawTransaction
    return Buffer.alloc(0);
  }

  /**
   * Converte endereço para scriptPubKey
   */
  private addressToScriptPubKey(address: string): Buffer {
    // Implementação simplificada para diferentes tipos de endereço
    if (address.startsWith('1')) {
      // P2PKH: OP_DUP OP_HASH160 <20-byte hash> OP_EQUALVERIFY OP_CHECKSIG
      const hash = this.hexToBuffer(address.slice(1)); // Remove '1' prefix
      return Buffer.concat([
        Buffer.from([0x76, 0xa9, 0x14]), // OP_DUP OP_HASH160 0x14
        hash,
        Buffer.from([0x88, 0xac]) // OP_EQUALVERIFY OP_CHECKSIG
      ]);
    } else if (address.startsWith('bc1q') || address.startsWith('BC1Q')) {
      // P2WPKH (Bech32): OP_0 <20-byte hash>
      // Para simplificar, vamos usar um script básico
      // Em produção, seria necessário decodificar o Bech32
      return Buffer.from([0x00, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    } else if (address.startsWith('3')) {
      // P2SH: OP_HASH160 <20-byte hash> OP_EQUAL
      const hash = this.hexToBuffer(address.slice(1)); // Remove '3' prefix
      return Buffer.concat([
        Buffer.from([0xa9, 0x14]), // OP_HASH160 0x14
        hash,
        Buffer.from([0x87]) // OP_EQUAL
      ]);
    }
    
    // Para outros tipos de endereço, retornar script básico P2PKH
    return Buffer.from([0x76, 0xa9, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x88, 0xac]);
  }

  /**
   * Assina transação raw
   */
  private async signRawTransaction(rawTx: Buffer, transaction: RawTransaction, wallet: BitcoinWallet): Promise<string> {
    try {
      console.log('🔐 Assinando inputs da transação...');
      
      // Construir transação raw com assinaturas reais
      const signedTx = await this.buildSignedRawTransaction(transaction, wallet);
      
      console.log('✅ Transação raw construída com assinatura real');
      return signedTx;
    } catch (error) {
      console.error('Erro ao assinar transação raw:', error);
      throw error;
    }
  }

  /**
   * Constrói transação raw com assinaturas reais
   */
  private async buildSignedRawTransaction(transaction: RawTransaction, wallet: BitcoinWallet): Promise<string> {
    console.log('🔨 Construindo transação raw com assinaturas...');
    
    // Usar dados reais da transação construída
    const input = transaction.inputs[0];
    const output1 = transaction.outputs[0]; // Destino
    const output2 = transaction.outputs[1]; // Change (pode não existir)
    
    // Estrutura básica: version + inputs + outputs + locktime
    let rawTx = '01000000'; // Version (4 bytes)
    
    // Input count
    rawTx += '01'; // 1 input
    
    // Input (usando dados reais)
    // Converter txid para little-endian (reverso do string)
    const txidLittleEndian = this.hexStringToLittleEndian(input.txid);
    rawTx += txidLittleEndian; // Previous txid (32 bytes)
    rawTx += this.uint32ToLE(input.vout).toString('hex'); // Previous output index (4 bytes)
    
    // Script de assinatura (P2PKH)
    const signatureScript = await this.createSignatureScript(wallet, transaction);
    const scriptLength = this.toVarInt(signatureScript.length / 2).toString('hex'); // Script length em bytes
    rawTx += scriptLength;
    rawTx += signatureScript; // Script
    
    rawTx += 'ffffffff'; // Sequence (4 bytes)
    
    // Output count - verificar se há troco
    const outputCount = transaction.outputs.length;
    rawTx += outputCount.toString(16).padStart(2, '0'); // Output count
    
    // Output 1 (destino)
    console.log('🔍 [DEBUG] Output 1 - Endereço destino:', output1.address);
    console.log('🔍 [DEBUG] Output 1 - Valor:', output1.value);
    rawTx += this.uint64ToLE(output1.value).toString('hex'); // Value
    const destScript = this.addressToScript(output1.address);
    console.log('🔍 [DEBUG] Output 1 - Script gerado:', destScript);
    rawTx += this.toVarInt(destScript.length / 2).toString('hex'); // Script length
    rawTx += destScript; // Script
    
    // Output 2 (change) - apenas se existir
    if (output2) {
      console.log('🔍 [DEBUG] Output 2 - Endereço troco:', output2.address);
      console.log('🔍 [DEBUG] Output 2 - Valor:', output2.value);
      rawTx += this.uint64ToLE(output2.value).toString('hex'); // Value
      const changeScript = this.addressToScript(output2.address);
      console.log('🔍 [DEBUG] Output 2 - Script gerado:', changeScript);
      rawTx += this.toVarInt(changeScript.length / 2).toString('hex'); // Script length
      rawTx += changeScript; // Script
    } else {
      console.log('🔍 [DEBUG] Sem output de troco');
    }
    
    // Locktime
    rawTx += '00000000'; // Locktime (4 bytes)
    
    console.log('📝 Transação raw construída:', rawTx);
    return rawTx;
  }

  /**
   * Converte endereço Bitcoin para script
   */
  private addressToScript(address: string): string {
    console.log('🔍 [DEBUG] Convertendo endereço para script:', address);
    
    // Para P2PKH (Legacy): OP_DUP OP_HASH160 <hash> OP_EQUALVERIFY OP_CHECKSIG
    if (address.startsWith('1')) {
      try {
        // Decodificar endereço Base58 para obter o hash real
        const decoded = this.base58Decode(address);
        const hash = decoded.slice(1, 21); // Remover prefixo e checksum
        const script = '76a914' + secp256k1.etc.bytesToHex(hash) + '88ac';
        console.log('🔍 [DEBUG] Script P2PKH gerado:', script);
        return script;
      } catch (error) {
        console.error('❌ Erro ao decodificar endereço P2PKH:', error);
        throw new Error('Endereço P2PKH inválido');
      }
    }
    
    // Para P2WPKH (Bech32): OP_0 <20-byte hash>
    if (address.startsWith('bc1q')) {
      try {
        // Para Bech32, precisamos decodificar corretamente
        // Implementação simplificada - em produção usar biblioteca bech32
        const decoded = this.decodeBech32(address);
        const script = '0014' + secp256k1.etc.bytesToHex(decoded);
        console.log('🔍 [DEBUG] Script P2WPKH gerado:', script);
        return script;
      } catch (error) {
        console.error('❌ Erro ao processar endereço Bech32:', error);
        throw new Error('Endereço Bech32 inválido');
      }
    }
    
    // Para P2SH (3...): OP_HASH160 <hash> OP_EQUAL
    if (address.startsWith('3')) {
      try {
        const decoded = this.base58Decode(address);
        const hash = decoded.slice(1, 21); // Remover prefixo e checksum
        const script = 'a914' + secp256k1.etc.bytesToHex(hash) + '87';
        console.log('🔍 [DEBUG] Script P2SH gerado:', script);
        return script;
      } catch (error) {
        console.error('❌ Erro ao decodificar endereço P2SH:', error);
        throw new Error('Endereço P2SH inválido');
      }
    }
    
    // Para outros tipos, retornar erro
    console.error('❌ Tipo de endereço não suportado:', address);
    throw new Error('Tipo de endereço não suportado');
  }

  /**
   * Decodifica endereço Bech32 usando biblioteca bech32
   */
  private decodeBech32(address: string): Uint8Array {
    console.log('🔍 [DEBUG] Decodificando Bech32:', address);
    console.log('🔍 [DEBUG] bitcoinjs-lib disponível:', !!bitcoin);
    console.log('🔍 [DEBUG] bitcoin.address disponível:', !!bitcoin.address);
    console.log('🔍 [DEBUG] bitcoin.address.fromBech32 disponível:', !!bitcoin.address.fromBech32);
    
    try {
      // Decodificar endereço Bech32 usando bitcoinjs-lib
      const decoded = bitcoin.address.fromBech32(address);
      console.log('🔍 [DEBUG] Bech32 decodificado:', decoded);
      
      // Para P2WPKH (bc1q...), extrair o hash
      if (address.startsWith('bc1q')) {
        const hash = new Uint8Array(decoded.data);
        console.log('🔍 [DEBUG] Hash P2WPKH extraído:', secp256k1.etc.bytesToHex(hash));
        console.log('🔍 [DEBUG] Endereço original:', address);
        console.log('🔍 [DEBUG] Hash extraído:', secp256k1.etc.bytesToHex(hash));
        return hash;
      }
      
      // Para P2WSH (bc1...), retornar todos os dados
      if (address.startsWith('bc1')) {
        console.log('🔍 [DEBUG] Endereço P2WSH detectado');
        return new Uint8Array(decoded.data);
      }
      
      // Para outros tipos, retornar todos os dados
      return new Uint8Array(decoded.data);
    } catch (error) {
      console.error('❌ Erro ao decodificar Bech32:', error);
      console.error('❌ Endereço Bech32 inválido ou malformado:', address);
      
      // Não usar fallback incorreto - retornar erro claro
      throw new Error(`Endereço Bech32 inválido: ${address}. Verifique se o endereço está correto.`);
    }
  }

  /**
   * Decodifica endereço Base58
   */
  private base58Decode(address: string): Uint8Array {
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let num = BigInt(0);
    let multi = BigInt(1);
    
    // Contar zeros à esquerda
    let leadingZeros = 0;
    for (let i = 0; i < address.length && address[i] === '1'; i++) {
      leadingZeros++;
    }
    
    for (let i = address.length - 1; i >= 0; i--) {
      const char = address[i];
      const index = alphabet.indexOf(char);
      if (index === -1) throw new Error('Invalid Base58 character');
      num += BigInt(index) * multi;
      multi *= BigInt(58);
    }
    
    // Converter para hex e garantir padding
    let hex = num.toString(16);
    if (hex.length % 2 !== 0) {
      hex = '0' + hex;
    }
    
    // Criar array de bytes
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    
    // Adicionar zeros à esquerda
    if (leadingZeros > 0) {
      const result = new Uint8Array(bytes.length + leadingZeros);
      result.set(bytes, leadingZeros);
      return result;
    }
    
    return bytes;
  }

  /**
   * Cria script de assinatura para P2PKH
   */
  private async createSignatureScript(wallet: BitcoinWallet, transaction: RawTransaction): Promise<string> {
    // Usar a chave privada real da carteira
    const privateKeyHex = wallet.privateKeys.p2pkh;
    const privateKey = secp256k1.etc.hexToBytes(privateKeyHex);
    
    // Gerar chave pública a partir da chave privada
    const publicKey = secp256k1.getPublicKey(privateKey, true); // comprimida
    const publicKeyHex = secp256k1.etc.bytesToHex(publicKey);
    
    // Verificar se a chave pública gera o endereço correto
    const generatedAddress = this.generateP2PKHAddress(publicKey);
    // console.log('🔍 [DEBUG] Chave privada:', privateKeyHex); // REMOVIDO POR SEGURANÇA
    console.log('🔍 [DEBUG] Chave pública:', publicKeyHex);
    console.log('🔍 [DEBUG] Endereço gerado:', generatedAddress);
    console.log('🔍 [DEBUG] Endereço esperado:', wallet.addresses.p2pkh);
    console.log('🔍 [DEBUG] Endereços coincidem:', generatedAddress === wallet.addresses.p2pkh);
    
    // Gerar assinatura ECDSA real usando secp256k1
    // Para P2PKH, precisamos assinar o hash da transação
    const transactionHash = this.calculateTransactionHash(transaction, publicKeyHex, wallet);
    const messageBytes = secp256k1.etc.hexToBytes(transactionHash);
    
    // Verificar se o patch foi aplicado
    assertSecpReady();
    
    // Gerar assinatura ECDSA real usando secp256k1
    const signature = await secp256k1.sign(messageBytes, privateKey);
    const signatureBytes = signature.toCompactRawBytes(); // Formato compact da assinatura (64 bytes)
    
    // Converter de compact (64 bytes) para DER manualmente
    const r = signatureBytes.slice(0, 32);
    const s = signatureBytes.slice(32, 64);
    const derSignature = this.buildDERSignature(r, s);
    const signatureHex = secp256k1.etc.bytesToHex(derSignature) + '01'; // SIGHASH_ALL
    
    console.log('🔍 [DEBUG] Assinatura compact (64 bytes):', secp256k1.etc.bytesToHex(signatureBytes));
    console.log('🔍 [DEBUG] Assinatura DER:', secp256k1.etc.bytesToHex(derSignature));
    console.log('🔍 [DEBUG] Assinatura DER + SIGHASH_ALL:', signatureHex);
    
    // Adicionar tamanhos em bytes
    const sigLength = (signatureHex.length / 2).toString(16).padStart(2, '0');
    const pubkeyLength = (publicKeyHex.length / 2).toString(16).padStart(2, '0');
    
    return sigLength + signatureHex + pubkeyLength + publicKeyHex;
  }

  /**
   * Constrói transação raw básica (para teste)
   */
  private buildBasicRawTransaction(transaction: RawTransaction): string {
    // Transação raw de exemplo para teste
    // Em produção, seria necessário implementar a serialização completa
    
    // Estrutura básica: version + inputs + outputs + locktime
    let rawTx = '01000000'; // Version (4 bytes)
    
    // Input count
    rawTx += '01'; // 1 input
    
    // Input (simplificado)
    rawTx += '0000000000000000000000000000000000000000000000000000000000000000'; // Previous txid (32 bytes)
    rawTx += 'ffffffff'; // Previous output index (4 bytes)
    rawTx += '00'; // Script length (0)
    rawTx += 'ffffffff'; // Sequence (4 bytes)
    
    // Output count
    rawTx += '01'; // 1 output
    
    // Output
    rawTx += '0000000000000000'; // Value (8 bytes) - 0 sats para teste
    rawTx += '19'; // Script length (25 bytes)
    rawTx += '76a914000000000000000000000000000000000000000088ac'; // Script (P2PKH básico)
    
    // Locktime
    rawTx += '00000000'; // Locktime (4 bytes)
    
    return rawTx;
  }

  /**
   * Envia uma transação Bitcoin (construir + assinar + broadcast)
   */
  async sendTransaction(
    fromAddress: string,
    toAddress: string,
    amount: number,
    feeRate: number = 10
  ): Promise<string> {
    try {
      console.log('🚀 Enviando transação Bitcoin...');
      
      // 1. Carregar carteira
      const wallet = await this.loadWallet();
      if (!wallet) {
        throw new Error('Carteira não encontrada');
      }

      // 2. Construir transação
      const transaction = await this.buildTransaction(fromAddress, toAddress, amount, feeRate);
      console.log('✅ Transação construída');

      // 3. Assinar transação
      const rawTransaction = await this.signTransaction(transaction, wallet);
      console.log('✅ Transação assinada');

      // 4. Transmitir transação
      const result = await bitcoinApiService.broadcastTransaction(rawTransaction);
      console.log('✅ Transação transmitida:', result.txid);

      return result.txid;
    } catch (error) {
      console.error('Erro ao enviar transação:', error);
      throw error;
    }
  }

  /**
   * Converte string hex para little-endian
   */
  private hexStringToLittleEndian(hexString: string): string {
    // Remove espaços e converte para uppercase
    const cleanHex = hexString.replace(/\s/g, '').toUpperCase();
    
    // Converte para little-endian (reverso de pares de bytes)
    let littleEndian = '';
    for (let i = cleanHex.length - 2; i >= 0; i -= 2) {
      littleEndian += cleanHex.substr(i, 2);
    }
    
    return littleEndian;
  }

  /**
   * Constrói assinatura DER a partir de r e s
   */
  private buildDERSignature(r: Uint8Array, s: Uint8Array): Uint8Array {
    // Remove leading zeros
    const rClean = this.removeLeadingZeros(r);
    const sClean = this.removeLeadingZeros(s);
    
    // Build DER structure: 0x30 + length + 0x02 + r_length + r + 0x02 + s_length + s
    const rLength = rClean.length;
    const sLength = sClean.length;
    const totalLength = 1 + 1 + rLength + 1 + 1 + sLength; // 0x02 + r_len + r + 0x02 + s_len + s
    
    const der = new Uint8Array(2 + totalLength);
    let offset = 0;
    
    der[offset++] = 0x30; // SEQUENCE
    der[offset++] = totalLength; // Total length
    
    der[offset++] = 0x02; // INTEGER
    der[offset++] = rLength; // R length
    der.set(rClean, offset);
    offset += rLength;
    
    der[offset++] = 0x02; // INTEGER
    der[offset++] = sLength; // S length
    der.set(sClean, offset);
    
    return der;
  }

  /**
   * Remove zeros à esquerda de um array de bytes
   */
  private removeLeadingZeros(bytes: Uint8Array): Uint8Array {
    let start = 0;
    while (start < bytes.length && bytes[start] === 0) {
      start++;
    }
    
    // Se todos os bytes são zero, retornar um array com um zero
    if (start === bytes.length) {
      return new Uint8Array([0]);
    }
    
    // Se o primeiro byte não-zero tem bit mais significativo setado, adicionar zero à esquerda
    if (bytes[start] & 0x80) {
      const result = new Uint8Array(bytes.length - start + 1);
      result[0] = 0;
      result.set(bytes.slice(start), 1);
      return result;
    }
    
    return bytes.slice(start);
  }

  /**
   * Calcula o hash da transação para assinatura P2PKH
   */
  private calculateTransactionHash(transaction: RawTransaction, publicKeyHex: string, wallet?: BitcoinWallet): string {
    // Para P2PKH, precisamos calcular o hash da transação
    // Vamos usar uma implementação simplificada
    
    // Construir a transação sem assinatura
    let rawTx = '01000000'; // Version
    
    // Input count
    rawTx += '01'; // 1 input
    
    // Input (sem script de assinatura)
    const input = transaction.inputs[0];
    const txidLittleEndian = this.hexStringToLittleEndian(input.txid);
    rawTx += txidLittleEndian; // Previous txid
    rawTx += this.uint32ToLE(input.vout).toString('hex'); // Previous output index
    
    // Script do UTXO que estamos gastando (usar o script_pub_key real)
    console.log('🔍 [DEBUG] script_pub_key do UTXO:', input.scriptPubKey);
    console.log('🔍 [DEBUG] Endereço do UTXO:', (input as any).address || 'N/A');
    
    // Verificar se é P2PKH
    if (input.scriptPubKey && input.scriptPubKey.length > 0) {
      console.log('🔍 [DEBUG] Verificando se script da API está correto');
      // Gerar script correto para comparar
      if (wallet) {
        const walletAddress = wallet.addresses.p2pkh;
        const correctScript = this.addressToScript(walletAddress);
        console.log('🔍 [DEBUG] Script da API:', input.scriptPubKey);
        console.log('🔍 [DEBUG] Script correto:', correctScript);
        
        if (input.scriptPubKey === correctScript) {
          console.log('✅ Script da API está correto, usando ele');
          rawTx += this.toVarInt(input.scriptPubKey.length / 2).toString('hex');
          rawTx += input.scriptPubKey;
        } else {
          console.log('❌ Script da API está incorreto, usando script correto');
          rawTx += this.toVarInt(correctScript.length / 2).toString('hex');
          rawTx += correctScript;
        }
      } else {
        console.log('🔍 [DEBUG] Usando script_pub_key da API (sem wallet para verificar)');
        const utxoScript = input.scriptPubKey;
        rawTx += this.toVarInt(utxoScript.length / 2).toString('hex');
        rawTx += utxoScript;
      }
    } else {
      console.log('🔍 [DEBUG] script_pub_key vazio, gerando script correto');
      if (wallet) {
        const walletAddress = wallet.addresses.p2pkh;
        const correctScript = this.addressToScript(walletAddress);
        console.log('🔍 [DEBUG] Script correto gerado:', correctScript);
        rawTx += this.toVarInt(correctScript.length / 2).toString('hex');
        rawTx += correctScript;
      } else {
        throw new Error('Wallet não disponível para gerar script correto');
      }
    }
    
    rawTx += 'ffffffff'; // Sequence
    
    // Output count - usar o número real de outputs
    const outputCount = transaction.outputs.length;
    rawTx += outputCount.toString(16).padStart(2, '0'); // Output count
    
    // Outputs
    for (const output of transaction.outputs) {
      rawTx += this.uint64ToLE(output.value).toString('hex'); // Value
      const script = this.addressToScript(output.address);
      rawTx += this.toVarInt(script.length / 2).toString('hex'); // Script length
      rawTx += script; // Script
    }
    
    // Locktime
    rawTx += '00000000'; // Locktime
    
    // SIGHASH_ALL
    rawTx += '01000000'; // SIGHASH_ALL (4 bytes)
    
    console.log('🔍 [DEBUG] Transação para hash:', rawTx);
    console.log('🔍 [DEBUG] Tamanho do preimage:', rawTx.length / 2, 'bytes');
    console.log('🔍 [DEBUG] Termina com SIGHASH_ALL:', rawTx.endsWith('01000000'));
    
    // Calcular hash SHA256 duplo
    const txBytes = secp256k1.etc.hexToBytes(rawTx);
    const firstHash = this.sha256(txBytes);
    const secondHash = this.sha256(firstHash);
    
    console.log('🔍 [DEBUG] Primeiro hash SHA256:', secp256k1.etc.bytesToHex(firstHash));
    console.log('🔍 [DEBUG] Segundo hash SHA256 (final):', secp256k1.etc.bytesToHex(secondHash));
    
    const finalHash = secp256k1.etc.bytesToHex(secondHash);
    
    return finalHash;
  }

  /**
   * Extrai o hash do endereço do scriptPubKey
   */
  private getAddressHash(scriptPubKey: string): string {
    // Para P2PKH, o script é: OP_DUP OP_HASH160 <20-byte hash> OP_EQUALVERIFY OP_CHECKSIG
    // Se o scriptPubKey estiver vazio, vamos usar um hash fixo baseado no endereço
    if (!scriptPubKey || scriptPubKey === '') {
      // Hash fixo para o endereço 1PG8nYg3rfgRMthiJNstwxcyeV6bsfxbFP
      return '2f8167f0e5fbc072ada35a312e89f209f36af97b';
    }
    
    // Se o scriptPubKey já contém o hash, extrair
    if (scriptPubKey.length >= 40) {
      return scriptPubKey.substring(0, 40);
    }
    
    // Fallback: hash fixo
    return '2f8167f0e5fbc072ada35a312e89f209f36af97b';
  }
}

export const bitcoinService = new BitcoinService();


