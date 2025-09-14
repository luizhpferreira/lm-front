// src/services/bitcoinService.ts

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { HDKey } from "@scure/bip32";
import * as secp from "@noble/secp256k1";
import { ripemd160 } from "@noble/hashes/legacy";
import { sha256 } from "@noble/hashes/sha2";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hexToBytes } from '@noble/hashes/utils';
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

export interface FeeOptions {
  economy: number;    // Taxa econômica (mempool padrão)
  hour: number;       // Taxa média (1 hora)
  fastest: number;    // Taxa rápida (10-30 min)
  custom?: number;    // Taxa customizada pelo usuário
}

export interface FeeEstimate {
  satPerVByte: number; // Corrigido: usar sat/vbyte para SegWit
  estimatedTime: string;
  description: string;
  priority: 'economy' | 'standard' | 'fast' | 'custom';
}

export enum FeePriority {
  ECONOMY = 'economy',
  STANDARD = 'standard', 
  FAST = 'fast',
  CUSTOM = 'custom'
}

export interface FeeValidationResult {
  isValid: boolean;
  message?: string;
  warning?: string;
  severity: 'error' | 'warning' | 'info';
  suggestedRate?: number;
}

export interface FeeValidationContext {
  amount: number; // em satoshis
  txSize?: number; // tamanho estimado da transação em bytes
  txVSize?: number; // tamanho virtual estimado da transação em vbytes (para SegWit)
  addressType?: 'p2pkh' | 'p2sh' | 'p2wpkh'; // tipo de endereço
  networkFees?: { economy_fee: number; hour_fee: number; fastest_fee: number };
  urgency?: 'low' | 'medium' | 'high';
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

  // deriva chave para path padrão BIP84 (Native SegWit: m/84'/0'/0'/0/0)
  getKey(path = "m/84'/0'/0'/0/0"): BitcoinKey {
    if (!this.root) {
      throw new Error("Wallet não inicializada");
    }
    const child = this.root.derive(path);
    if (!child.privateKey) {
      throw new Error("Falha ao derivar chave privada");
    }
    const publicKey = secp.getPublicKey(child.privateKey, true); // compressed
    
    // Gerar endereço Bitcoin (padrão: Bech32 para Native SegWit)
    const address = this.generateAddress(publicKey, 'bech32');
    console.log('🔑 [KEY DERIVED]', {
      path,
      publicKey: Buffer.from(publicKey).toString('hex').slice(0, 16) + '...',
      address
    });
    
    return {
      path,
      privateKey: Buffer.from(child.privateKey).toString("hex"),
      publicKey: Buffer.from(publicKey).toString("hex"),
      address,
    };
  }

  // Gera endereço Bitcoin real e válido (padrão: Bech32 para novos usuários)
  private generateAddress(publicKey: Uint8Array, type: 'p2pkh' | 'p2sh' | 'bech32' = 'bech32'): string {
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

  // Decodificação Base58
  private base58Decode(text: string): Uint8Array {
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let num = BigInt(0);
    for (let i = 0; i < text.length; i++) {
      const charIndex = alphabet.indexOf(text[i]);
      if (charIndex === -1) throw new Error('Caractere inválido em Base58');
      num = num * BigInt(58) + BigInt(charIndex);
    }
    // converter BigInt para bytes
    const bytes: number[] = [];
    while (num > BigInt(0)) {
      bytes.unshift(Number(num % BigInt(256)));
      num = num / BigInt(256);
    }
    // preservar zeros à esquerda (cada '1' representa 0x00)
    for (let i = 0; i < text.length && text[i] === '1'; i++) {
      bytes.unshift(0);
    }
    return new Uint8Array(bytes);
  }

  // Decodifica Base58Check e retorna payload (sem checksum)
  private decodeBase58Check(address: string): Uint8Array {
    const full = this.base58Decode(address);
    if (full.length < 5) throw new Error('Endereço Base58Check inválido');
    const payload = full.slice(0, -4);
    const checksum = full.slice(-4);
    const expected = sha256(sha256(payload)).slice(0, 4);
    for (let i = 0; i < 4; i++) {
      if (checksum[i] !== expected[i]) throw new Error('Checksum inválido no endereço');
    }
    return payload;
  }

  // Monta scriptPubKey P2PKH (OP_DUP OP_HASH160 <20-byte> OP_EQUALVERIFY OP_CHECKSIG)
  private buildP2PKHOutputScriptFromAddress(address: string): Uint8Array {
    const payload = this.decodeBase58Check(address);
    const version = payload[0];
    if (version !== 0x00) throw new Error('Endereço não é P2PKH mainnet');
    const pubKeyHash = payload.slice(1); // 20 bytes
    if (pubKeyHash.length !== 20) throw new Error('pubKeyHash inválido');
    return new Uint8Array([0x76, 0xa9, 0x14, ...pubKeyHash, 0x88, 0xac]);
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

  // Converte número para varint (variable length integer) - CORREÇÃO CRÍTICA
  private toVarInt(n: number): Uint8Array {
    // CORREÇÃO CRÍTICA: Para valores < 0xFD, usar 1 byte direto
    if (n < 0xfd) {
      return Uint8Array.from([n]); // 1 byte direto
    } else if (n <= 0xffff) {
      return Uint8Array.from([0xfd, n & 0xff, (n >> 8) & 0xff]);
    } else if (n <= 0xffffffff) {
      return Uint8Array.from([
        0xfe,
        n & 0xff,
        (n >> 8) & 0xff,
        (n >> 16) & 0xff,
        (n >> 24) & 0xff,
      ]);
    } else {
      const buf = new ArrayBuffer(9);
      const view = new DataView(buf);
      view.setUint8(0, 0xff);
      view.setBigUint64(1, BigInt(n), true);
      return new Uint8Array(buf);
    }
  }

  // Converte assinatura compact (r||s, 64 bytes) para DER (ASN.1) - Hermes-safe
  private compactToDER(compact: Uint8Array): Uint8Array {
    if (!(compact instanceof Uint8Array) || compact.length !== 64) {
      throw new Error('compact signature deve ter 64 bytes (r||s)');
    }
    const rRaw = compact.slice(0, 32);
    const sRaw = compact.slice(32, 64);

    const stripZeros = (v: Uint8Array) => {
      let i = 0;
      while (i < v.length - 1 && v[i] === 0) i++;
      return v.slice(i);
    };
    const toDERInt = (v: Uint8Array) => {
      let t = stripZeros(v);
      if (t[0] & 0x80) {
        const out = new Uint8Array(t.length + 1);
        out[0] = 0x00;
        out.set(t, 1);
        t = out;
      }
      const res = new Uint8Array(2 + t.length);
      res[0] = 0x02; // INTEGER
      res[1] = t.length;
      res.set(t, 2);
      return res;
    };

    const rDER = toDERInt(rRaw);
    const sDER = toDERInt(sRaw);
    const len = rDER.length + sDER.length;
    const der = new Uint8Array(2 + len);
    der[0] = 0x30; // SEQUENCE
    der[1] = len;  // <= 72, cabe em 1 byte
    der.set(rDER, 2);
    der.set(sDER, 2 + rDER.length);
    return der;
  }

  // Decodifica Bech32 (bc1...) -> { hrp, data }
  private bech32Decode(addr: string): { hrp: string; data: number[] } {
    const alphabet = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
    const lower = addr.toLowerCase();
    const pos = lower.lastIndexOf('1');
    if (pos < 1) throw new Error('Endereço bech32 inválido');
    const hrp = lower.slice(0, pos);
    const dataPart = lower.slice(pos + 1);
    const data: number[] = [];
    for (let i = 0; i < dataPart.length; i++) {
      const v = alphabet.indexOf(dataPart[i]);
      if (v === -1) throw new Error('Caractere inválido em bech32');
      data.push(v);
    }
    // checksum check
    const values = [...this.bech32HrpExpand(hrp), ...data];
    if (this.bech32Polymod(values) !== 1) throw new Error('Checksum bech32 inválido');
    // remove checksum (last 6)
    return { hrp, data: data.slice(0, -6) };
  }

  // Converte 5 bits -> 8 bits (para program bech32)
  private convertBitsTo8(data: number[], fromBits: number, toBits: number): Uint8Array {
    let acc = 0;
    let bits = 0;
    const maxv = (1 << toBits) - 1;
    const out: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const value = data[i];
      if (value < 0 || (value >> fromBits) !== 0) throw new Error('Valor inválido em convertBits');
      acc = (acc << fromBits) | value;
      bits += fromBits;
      while (bits >= toBits) {
        bits -= toBits;
        out.push((acc >> bits) & maxv);
      }
    }
    if (bits > 0) out.push((acc << (toBits - bits)) & maxv);
    return new Uint8Array(out);
  }

  // Script P2SH a partir de endereço 3...
  private buildP2SHOutputScriptFromAddress(address: string): Uint8Array {
    const payload = this.decodeBase58Check(address);
    const version = payload[0];
    if (version !== 0x05) throw new Error('Endereço não é P2SH mainnet');
    const scriptHash = payload.slice(1); // 20 bytes
    if (scriptHash.length !== 20) throw new Error('scriptHash inválido');
    // OP_HASH160 0x14 <20-byte> OP_EQUAL
    return new Uint8Array([0xa9, 0x14, ...scriptHash, 0x87]);
  }

  // Script P2WPKH a partir de endereço bc1...
  private buildBech32P2WPKHOutputScriptFromAddress(address: string): Uint8Array {
    const { hrp, data } = this.bech32Decode(address);
    if (hrp !== 'bc') throw new Error('Endereço bech32 não-mainnet');
    const witnessVersion = data[0];
    const prog5 = data.slice(1);
    const program = this.convertBitsTo8(prog5, 5, 8);
    if (witnessVersion !== 0 || program.length !== 20) throw new Error('Apenas P2WPKH (v0, 20 bytes) suportado');
    // 0x00 0x14 <20-byte>
    return new Uint8Array([0x00, 0x14, ...program]);
  }

  // Seleciona scriptPubKey baseado no tipo do endereço
  private buildOutputScriptFromAddress(address: string): Uint8Array {
    if (address.startsWith('1')) return this.buildP2PKHOutputScriptFromAddress(address);
    if (address.startsWith('3')) return this.buildP2SHOutputScriptFromAddress(address);
    if (address.toLowerCase().startsWith('bc1')) return this.buildBech32P2WPKHOutputScriptFromAddress(address);
    throw new Error('Tipo de endereço não suportado');
  }

  // Extrai hash160 de um endereço Bitcoin
  private getAddressHash160(address: string): string {
    if (address.startsWith('1')) {
      // P2PKH: decodificar Base58Check e extrair hash160
      const payload = this.decodeBase58Check(address);
      return Array.from(payload.slice(1)).map(b => b.toString(16).padStart(2, '0')).join('');
    } else if (address.startsWith('3')) {
      // P2SH: decodificar Base58Check e extrair hash160
      const payload = this.decodeBase58Check(address);
      return Array.from(payload.slice(1)).map(b => b.toString(16).padStart(2, '0')).join('');
    } else if (address.toLowerCase().startsWith('bc1')) {
      // P2WPKH: decodificar Bech32 e extrair hash160
      const { data } = this.bech32Decode(address);
      const program = this.convertBitsTo8(data.slice(1), 5, 8);
      return Array.from(program).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    throw new Error('Tipo de endereço não suportado');
  }

  // Detecta o tipo de endereço e retorna informações necessárias
  private getAddressInfo(address: string): { type: 'p2pkh' | 'p2sh' | 'p2wpkh'; scriptPubKey: Uint8Array; witnessVersion?: number } {
    if (address.startsWith('1')) {
      return {
        type: 'p2pkh',
        scriptPubKey: this.buildP2PKHOutputScriptFromAddress(address)
      };
    } else if (address.startsWith('3')) {
      return {
        type: 'p2sh',
        scriptPubKey: this.buildP2SHOutputScriptFromAddress(address)
      };
    } else if (address.toLowerCase().startsWith('bc1')) {
      return {
        type: 'p2wpkh',
        scriptPubKey: this.buildBech32P2WPKHOutputScriptFromAddress(address),
        witnessVersion: 0
      };
    }
    throw new Error('Tipo de endereço não suportado');
  }

  // ✅ TESTE: Função para testar diferentes paths de derivação
  private testKeyDerivation(targetHash160: string): void {
    if (!this.root) {
      console.error('❌ [KEY DERIVATION TEST] Wallet não inicializada');
      return;
    }

    const testPaths = [
      "m/44'/0'/0'/0/0",  // Path atual
      "m/44'/0'/0'/0/1",  // Próximo índice
      "m/44'/0'/0'/0/2",  // Próximo índice
      "m/44'/0'/0'/0/3",  // Próximo índice
      "m/44'/0'/0'/0/4",  // Próximo índice
      "m/44'/0'/0'/0/5",  // Próximo índice
      "m/44'/0'/0'/1/0",  // Mudança
      "m/44'/0'/0'/1/1",  // Mudança + 1
      "m/44'/0'/0'/1/2",  // Mudança + 2
      "m/44'/0'/0'/1/3",  // Mudança + 3
      "m/44'/0'/0'/1/4",  // Mudança + 4
      "m/44'/0'/0'/1/5",  // Mudança + 5
      "m/84'/0'/0'/0/0",  // Native SegWit
      "m/84'/0'/0'/0/1",  // Native SegWit + 1
      "m/84'/0'/0'/0/2",  // Native SegWit + 2
      "m/84'/0'/0'/0/3",  // Native SegWit + 3
      "m/84'/0'/0'/0/4",  // Native SegWit + 4
      "m/84'/0'/0'/0/5",  // Native SegWit + 5
      "m/84'/0'/0'/1/0",  // Native SegWit mudança
      "m/84'/0'/0'/1/1",  // Native SegWit mudança + 1
      "m/49'/0'/0'/0/0",  // P2SH-P2WPKH
      "m/49'/0'/0'/0/1",  // P2SH-P2WPKH + 1
      "m/49'/0'/0'/0/2",  // P2SH-P2WPKH + 2
      "m/49'/0'/0'/0/3",  // P2SH-P2WPKH + 3
      "m/49'/0'/0'/0/4",  // P2SH-P2WPKH + 4
      "m/49'/0'/0'/0/5",  // P2SH-P2WPKH + 5
      "m/49'/0'/0'/1/0",  // P2SH-P2WPKH mudança
      "m/49'/0'/0'/1/1",  // P2SH-P2WPKH mudança + 1
    ];

    console.log('🔍 [KEY DERIVATION TEST] Testando paths para encontrar hash160:', targetHash160);
    
    for (const path of testPaths) {
      try {
        const child = this.root.derive(path);
        if (!child.privateKey) {
          console.log(`❌ [KEY DERIVATION TEST] Chave privada nula no path ${path}`);
          continue;
        }
        
        const publicKey = secp.getPublicKey(child.privateKey, true);
        const hash160 = ripemd160(sha256(publicKey));
        const hash160Hex = Array.from(hash160).map(b => b.toString(16).padStart(2, '0')).join('');
        
        console.log(`🔍 [KEY DERIVATION TEST] Path ${path}:`, hash160Hex);
        
        if (hash160Hex === targetHash160) {
          console.log(`✅ [KEY DERIVATION TEST] ENCONTRADO! Path correto: ${path}`);
          console.log(`✅ [KEY DERIVATION TEST] Chave privada:`, Buffer.from(child.privateKey).toString('hex'));
          console.log(`✅ [KEY DERIVATION TEST] Chave pública:`, Buffer.from(publicKey).toString('hex'));
          return;
        }
      } catch (error) {
        console.log(`❌ [KEY DERIVATION TEST] Erro no path ${path}:`, error);
      }
    }
    
    console.log('❌ [KEY DERIVATION TEST] Nenhum path encontrado para o hash160:', targetHash160);
    console.log('🔍 [UTXO ANALYSIS] Este UTXO pode ter sido criado externamente (não pela sua wallet)');
    console.log('🔍 [UTXO ANALYSIS] Soluções possíveis:');
    console.log('🔍 [UTXO ANALYSIS] 1. O UTXO foi criado por outra wallet/software');
    console.log('🔍 [UTXO ANALYSIS] 2. O UTXO foi criado com uma chave de um path não testado');
    console.log('🔍 [UTXO ANALYSIS] 3. O UTXO foi criado manualmente ou importado');
    console.log('🔍 [UTXO ANALYSIS] 4. Usar um UTXO diferente que pertença à sua wallet atual');
  }

  // Constrói preimage BIP143 para SegWit
  private buildBIP143Preimage(params: {
    inputs: { txid: string; vout: number; value: number }[];
    outputs: { value: number; scriptPubKey: Uint8Array }[];
    inputIndex: number;
    scriptCode: Uint8Array;
    hashType: number;
  }): Uint8Array {
    const { inputs, outputs, inputIndex, scriptCode, hashType } = params;
    
    const u32LE = (n: number): Uint8Array => new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
    const u64LE = (n: number): Uint8Array => {
      let x = BigInt(n);
      const b = new Uint8Array(8);
      for (let i = 0; i < 8; i++) b[i] = Number((x >> BigInt(8 * i)) & BigInt(0xff));
      return b;
    };
    const hexToBytes = (hex: string): Uint8Array => new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    const reverse32 = (hex: string): Uint8Array => {
      const bytes = hexToBytes(hex);
      return new Uint8Array(Array.from(bytes).reverse());
    };
    const concat = (...arrs: Uint8Array[]) => {
      const total = arrs.reduce((s, a) => s + a.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const a of arrs) { out.set(a, off); off += a.length; }
      return out;
    };

    // BIP143 preimage structure
    const parts: Uint8Array[] = [];
    
    // 1. Version (4 bytes)
    parts.push(u32LE(1));
    
    // 2. HashPrevouts (32 bytes) - SHA256 of all input outpoints
    console.log('🔍 [BIP143 CRITICAL] Calculando hashPrevouts...');
    console.log('🔍 [BIP143 CRITICAL] Número de inputs:', inputs.length);
    
    const prevouts = concat(...inputs.map((inp, index) => {
      const reversedTxid = reverse32(inp.txid);
      const voutBytes = u32LE(inp.vout);
      const outpoint = concat(reversedTxid, voutBytes);
      
      console.log(`🔍 [BIP143 CRITICAL] Input ${index}:`, {
        txid: inp.txid,
        reversedTxid: Array.from(reversedTxid).map(b => b.toString(16).padStart(2, '0')).join(''),
        vout: inp.vout,
        voutHex: Array.from(voutBytes).map(b => b.toString(16).padStart(2, '0')).join(''),
        outpointLength: outpoint.length,
        outpointHex: Array.from(outpoint).map(b => b.toString(16).padStart(2, '0')).join('')
      });
      
      return outpoint;
    }));
    
    console.log('🔍 [BIP143 CRITICAL] prevouts total length:', prevouts.length);
    console.log('🔍 [BIP143 CRITICAL] prevouts hex:', Array.from(prevouts).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // ✅ CORREÇÃO CRÍTICA: BIP143 exige double SHA256 (SHA256d)
    const hashPrevouts = sha256(sha256(prevouts));
    console.log('🔍 [BIP143 CRITICAL] hashPrevouts (SHA256d):', Array.from(hashPrevouts).map(b => b.toString(16).padStart(2, '0')).join(''));
    parts.push(hashPrevouts);
    
    // 3. HashSequence (32 bytes) - SHA256 of all input sequence numbers (0xffffffff for SIGHASH_ALL)
    console.log('🔍 [BIP143 CRITICAL] Calculando hashSequence...');
    
    const sequences = new Uint8Array(inputs.length * 4);
    for (let i = 0; i < inputs.length; i++) {
      const sequenceBytes = u32LE(0xffffffff);
      sequences.set(sequenceBytes, i * 4);
      console.log(`🔍 [BIP143 CRITICAL] Input ${i} sequence:`, Array.from(sequenceBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
    }
    
    console.log('🔍 [BIP143 CRITICAL] sequences total length:', sequences.length);
    console.log('🔍 [BIP143 CRITICAL] sequences hex:', Array.from(sequences).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // ✅ CORREÇÃO CRÍTICA: BIP143 exige double SHA256 (SHA256d)
    const hashSequence = sha256(sha256(sequences));
    console.log('🔍 [BIP143 CRITICAL] hashSequence (SHA256d):', Array.from(hashSequence).map(b => b.toString(16).padStart(2, '0')).join(''));
    parts.push(hashSequence);
    
    // 4. Outpoint (36 bytes) - txid + vout of current input
    const currentInput = inputs[inputIndex];
    parts.push(concat(reverse32(currentInput.txid), u32LE(currentInput.vout)));
    
    // 5. ScriptCode (varint + script)
    const scriptCodeLen = this.toVarInt(scriptCode.length);
    parts.push(concat(scriptCodeLen, scriptCode));
    
    // 6. Value (8 bytes) - value of current input - CRÍTICO para BIP143
    console.log('🔍 [BIP143 CRITICAL] Valor do UTXO:', currentInput.value, 'sats');
    console.log('🔍 [BIP143 CRITICAL] Valor do UTXO em BTC:', (currentInput.value / 100000000).toFixed(8), 'BTC');
    
    // ✅ VERIFICAÇÃO CRÍTICA: Verificar se o valor é um número válido
    if (typeof currentInput.value !== 'number' || currentInput.value <= 0) {
      console.error('❌ [BIP143 CRITICAL] ERRO: Valor do UTXO inválido!', currentInput.value);
      throw new Error('Valor do UTXO inválido');
    }
    
    const valueBytes = u64LE(currentInput.value);
    console.log('🔍 [BIP143 CRITICAL] Valor serializado:', Array.from(valueBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log('🔍 [BIP143 CRITICAL] Valor serializado (decimal):', Array.from(valueBytes).map(b => b.toString(10)).join(', '));
    console.log('🔍 [BIP143 CRITICAL] TXID do UTXO:', currentInput.txid);
    console.log('🔍 [BIP143 CRITICAL] VOUT do UTXO:', currentInput.vout);
    console.log('🔍 [BIP143 CRITICAL] ⚠️ VERIFICAÇÃO: Este valor deve ser EXATAMENTE o mesmo que o nó tem no UTXO set!');
    
    // ✅ VERIFICAÇÃO: Reconstruir o valor a partir dos bytes para confirmar
    let reconstructedValue = 0;
    for (let i = 0; i < 8; i++) {
      reconstructedValue += valueBytes[i] * Math.pow(256, i);
    }
    console.log('🔍 [BIP143 CRITICAL] Valor reconstruído:', reconstructedValue, 'sats');
    console.log('🔍 [BIP143 CRITICAL] Valores correspondem?', reconstructedValue === currentInput.value);
    
    parts.push(valueBytes);
    
    // 7. Sequence (4 bytes) - sequence number of current input
    parts.push(u32LE(0xffffffff));
    
    // 8. HashOutputs (32 bytes) - SHA256 of all outputs
    console.log('🔍 [BIP143 CRITICAL] Calculando hashOutputs...');
    console.log('🔍 [BIP143 CRITICAL] Número de outputs:', outputs.length);
    
    const outputsData = concat(...outputs.map((out, index) => {
      const valueBytes = u64LE(out.value);
      const lengthVarint = this.toVarInt(out.scriptPubKey.length);
      const outputData = concat(valueBytes, lengthVarint, out.scriptPubKey);
      
      console.log(`🔍 [BIP143 CRITICAL] Output ${index}:`, {
        value: out.value,
        valueHex: Array.from(valueBytes).map(b => b.toString(16).padStart(2, '0')).join(''),
        scriptPubKeyLength: out.scriptPubKey.length,
        scriptPubKeyHex: Array.from(out.scriptPubKey).map(b => b.toString(16).padStart(2, '0')).join(''),
        outputDataLength: outputData.length,
        outputDataHex: Array.from(outputData).map(b => b.toString(16).padStart(2, '0')).join('')
      });
      
      return outputData;
    }));
    
    console.log('🔍 [BIP143 CRITICAL] outputsData total length:', outputsData.length);
    console.log('🔍 [BIP143 CRITICAL] outputsData hex:', Array.from(outputsData).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // ✅ CORREÇÃO CRÍTICA: BIP143 exige double SHA256 (SHA256d)
    const hashOutputs = sha256(sha256(outputsData));
    console.log('🔍 [BIP143 CRITICAL] hashOutputs (SHA256d):', Array.from(hashOutputs).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    parts.push(hashOutputs);
    
    // 9. LockTime (4 bytes)
    parts.push(u32LE(0));
    
    // 10. SighashType (4 bytes)
    const sighashTypeBytes = u32LE(hashType);
    console.log('🔍 [BIP143 CRITICAL] SighashType:', hashType);
    console.log('🔍 [BIP143 CRITICAL] SighashType bytes:', Array.from(sighashTypeBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log('🔍 [BIP143 CRITICAL] SighashType deve ser 01000000 para SIGHASH_ALL');
    parts.push(sighashTypeBytes);
    
    const preimage = concat(...parts);
    
    // ✅ VERIFICAÇÃO CRÍTICA: Log completo do preimage para debug
    console.log('🔍 [BIP143 FINAL] Preimage completo length:', preimage.length, 'bytes');
    console.log('🔍 [BIP143 FINAL] Preimage hex completo:', Array.from(preimage).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // ✅ VERIFICAÇÃO: Estrutura do preimage BIP143
    console.log('🔍 [BIP143 STRUCTURE] Estrutura esperada:');
    console.log('🔍 [BIP143 STRUCTURE] 1. Version (4 bytes):', Array.from(preimage.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log('🔍 [BIP143 STRUCTURE] 2. HashPrevouts (32 bytes):', Array.from(preimage.slice(4, 36)).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log('🔍 [BIP143 STRUCTURE] 3. HashSequence (32 bytes):', Array.from(preimage.slice(36, 68)).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log('🔍 [BIP143 STRUCTURE] 4. Outpoint (36 bytes):', Array.from(preimage.slice(68, 104)).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // Encontrar onde começa o scriptCode (após o outpoint)
    let scriptCodeStart = 104;
    const scriptCodeLength = preimage[scriptCodeStart];
    console.log('🔍 [BIP143 STRUCTURE] 5. ScriptCode length varint:', scriptCodeLength.toString(16));
    scriptCodeStart += 1;
    console.log('🔍 [BIP143 STRUCTURE] 5. ScriptCode (' + scriptCodeLength + ' bytes):', Array.from(preimage.slice(scriptCodeStart, scriptCodeStart + scriptCodeLength)).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    scriptCodeStart += scriptCodeLength;
    console.log('🔍 [BIP143 STRUCTURE] 6. Value (8 bytes):', Array.from(preimage.slice(scriptCodeStart, scriptCodeStart + 8)).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    return preimage;
  }

  // Constrói e assina transação SegWit P2WPKH (bc1...)
  private async buildAndSignP2WPKH(params: {
    inputs: { txid: string; vout: number; value: number }[];
    outputs: { value: number; scriptPubKey: Uint8Array }[];
    privateKey: Uint8Array;
    publicKey: Uint8Array;
    fromAddress: string;
  }): Promise<string> {
    const { inputs, outputs, privateKey, publicKey, fromAddress } = params;
    
    const u32LE = (n: number): Uint8Array => new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
    const u64LE = (n: number): Uint8Array => {
      const b = new Uint8Array(8);
      // Para valores até 32 bits, usar apenas os primeiros 4 bytes
      b[0] = n & 0xff;
      b[1] = (n >> 8) & 0xff;
      b[2] = (n >> 16) & 0xff;
      b[3] = (n >> 24) & 0xff;
      // Os últimos 4 bytes ficam como 0
      return b;
    };
    const hexToBytes = (hex: string): Uint8Array => {
      const cleanHex = hex.replace(/^0x/, ''); // Remove 0x prefix if present
      return new Uint8Array(cleanHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    };
    const reverse32 = (hex: string): Uint8Array => {
      const bytes = hexToBytes(hex);
      return new Uint8Array(Array.from(bytes).reverse());
    };
    const concat = (...arrs: Uint8Array[]) => {
      const total = arrs.reduce((s, a) => s + a.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const a of arrs) { out.set(a, off); off += a.length; }
      return out;
    };

    // ScriptCode para P2WPKH: OP_DUP OP_HASH160 0x14 <20-byte hash160(pubkey)> OP_EQUALVERIFY OP_CHECKSIG
    const hash160 = ripemd160(sha256(publicKey));
    // ✅ CORREÇÃO CRÍTICA: O scriptCode deve ter exatamente 25 bytes (sem o 0x19 embutido)
    // O 0x19 será adicionado como varint em buildBIP143Preimage
    const finalScriptCode = new Uint8Array([
      0x76, 0xa9, 0x14,               // OP_DUP OP_HASH160 PUSH20
      ...hash160,                     // 20 bytes
      0x88, 0xac                      // OP_EQUALVERIFY OP_CHECKSIG
    ]); // length = 25
    
    console.log('🔍 [P2WPKH DEBUG] Hash160 da chave pública:', Array.from(hash160).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log('🔍 [BIP143 CRITICAL] ScriptCode length:', finalScriptCode.length, 'bytes (deve ser 25)');
    console.log('🔍 [BIP143 CRITICAL] ScriptCode hex:', Array.from(finalScriptCode).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log('🔍 [BIP143 CRITICAL] ScriptCode esperado: 76a914' + Array.from(hash160).map(b => b.toString(16).padStart(2, '0')).join('') + '88ac');
    console.log('🔍 [BIP143 CRITICAL] Verificação: scriptCode.length === 25?', finalScriptCode.length === 25);
    console.log('🔍 [BIP143 CRITICAL] Estrutura correta: [76a914] + [hash160] + [88ac] (25 bytes, sem prefixo 0x19)');
    console.log('🔍 [BIP143 CRITICAL] CORREÇÃO: scriptCode deve ter 25 bytes (o 0x19 será adicionado como varint em buildBIP143Preimage)!');
    
    // CORREÇÃO CRÍTICA: Teste rápido para verificar o scriptCode
    console.log('🔍 [BIP143 CRITICAL] TESTE RÁPIDO - ScriptCode:');
    console.log('🔍 [BIP143 CRITICAL] scriptCode hex:', Array.from(finalScriptCode).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log('🔍 [BIP143 CRITICAL] scriptCode length:', finalScriptCode.length);
    console.log('🔍 [BIP143 CRITICAL] Deve dar: 76a914<20bytes>88ac');
    console.log('🔍 [BIP143 CRITICAL] Deve dar: length = 25');
    
    if (finalScriptCode.length !== 25) {
      console.error('❌ [BIP143 CRITICAL] ERRO: scriptCode.length deve ser 25, mas é', finalScriptCode.length);
    }
    
    const expectedHex = '76a914' + Array.from(hash160).map(b => b.toString(16).padStart(2, '0')).join('') + '88ac';
    const actualHex = Array.from(finalScriptCode).map(b => b.toString(16).padStart(2, '0')).join('');
    if (actualHex !== expectedHex) {
      console.error('❌ [BIP143 CRITICAL] ERRO: scriptCode hex incorreto!');
      console.error('❌ [BIP143 CRITICAL] Esperado:', expectedHex);
      console.error('❌ [BIP143 CRITICAL] Atual:', actualHex);
    }
    
    // Verificar se o hash160 corresponde ao endereço
    // Para P2WPKH, precisamos do endereço do UTXO, não do TXID
    // Usar o endereço que está sendo gasto (fromAddress) passado como parâmetro
    const addressHash160 = this.getAddressHash160(fromAddress);
    console.log('🔍 [P2WPKH DEBUG] Hash160 esperado do endereço:', addressHash160);
    console.log('🔍 [P2WPKH DEBUG] Hash160s correspondem?', Array.from(hash160).map(b => b.toString(16).padStart(2, '0')).join('') === addressHash160);
    
    // Debug adicional para verificar se o hash160 está correto
    console.log('🔍 [P2WPKH DEBUG] Hash160 da chave pública (hex):', Array.from(hash160).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log('🔍 [P2WPKH DEBUG] Hash160 do endereço (hex):', addressHash160);
    console.log('🔍 [P2WPKH DEBUG] Chave pública (hex):', Array.from(publicKey).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log('🔍 [P2WPKH DEBUG] Endereço:', fromAddress);
    
    // INVESTIGAÇÃO SEGWIT: Comparar com implementação Legacy que funciona
    console.log('🔍 [SEGWIT INVESTIGATION] Comparando P2WPKH vs Legacy P2PKH...');
    
    // Verificar se o problema está no scriptCode para P2WPKH
    const legacyScriptCode = new Uint8Array([0x76, 0xa9, 0x14, ...hash160, 0x88, 0xac]);
    console.log('🔍 [SEGWIT INVESTIGATION] ScriptCode Legacy:', Array.from(legacyScriptCode).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log('🔍 [SEGWIT INVESTIGATION] ScriptCode P2WPKH:', Array.from(finalScriptCode).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log('🔍 [SEGWIT INVESTIGATION] ScriptCodes são iguais?', Array.from(legacyScriptCode).map(b => b.toString(16).padStart(2, '0')).join('') === Array.from(finalScriptCode).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // Verificar se o problema está no preimage BIP143
    console.log('🔍 [SEGWIT INVESTIGATION] Usando BIP143 preimage para SegWit...');
    console.log('🔍 [SEGWIT INVESTIGATION] Legacy usa preimage diferente (sem BIP143)');
    
    // INVESTIGAÇÃO CRÍTICA: Verificar se o problema está no preimage BIP143
    // Para P2WPKH, o preimage BIP143 pode estar incorreto
    console.log('🔍 [BIP143 INVESTIGATION] Verificando se o preimage BIP143 está correto...');
    
    // Testar se o problema está no preimage BIP143 vs Legacy
    // Legacy: version + inputs + outputs + locktime + sighash
    // BIP143: version + hashPrevouts + hashSequence + outpoint + scriptCode + value + sequence + hashOutputs + locktime + sighash
    
    // INVESTIGAÇÃO CRÍTICA: O problema pode estar na implementação do BIP143
    // Vamos verificar se o preimage BIP143 está sendo construído corretamente
    console.log('🔍 [BIP143 CRITICAL] Verificando se o problema está no preimage BIP143...');
    console.log('🔍 [BIP143 CRITICAL] Legacy funciona, SegWit falha - diferença no preimage!');
    
    // INVESTIGAÇÃO CRÍTICA: Verificar se a chave derivada realmente corresponde ao endereço
    console.log('🔍 [KEY MATCH CRITICAL] Verificando correspondência chave-endereço...');
    const derivedAddress = this.createBech32Address(hash160);
    console.log('🔍 [KEY MATCH CRITICAL] Endereço derivado da chave:', derivedAddress);
    console.log('🔍 [KEY MATCH CRITICAL] Endereço do UTXO:', fromAddress);
    console.log('🔍 [KEY MATCH CRITICAL] Endereços correspondem?', derivedAddress === fromAddress);
    
    if (derivedAddress !== fromAddress) {
      console.error('❌ [KEY MATCH CRITICAL] PROBLEMA ENCONTRADO: Chave derivada não corresponde ao endereço do UTXO!');
      console.error('❌ [KEY MATCH CRITICAL] Isso explica o erro OP_EQUALVERIFY!');
      throw new Error(`Chave derivada (${derivedAddress}) não corresponde ao endereço do UTXO (${fromAddress})`);
    }
    
    // Verificar se o scriptPubKey do UTXO corresponde ao esperado
    const expectedScriptPubKey = new Uint8Array([0x00, 0x14, ...hash160]);
    console.log('🔍 [P2WPKH DEBUG] ScriptPubKey esperado:', Array.from(expectedScriptPubKey).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // Verificar se o scriptPubKey do UTXO corresponde ao esperado
    const utxoScriptPubKey = this.buildBech32P2WPKHOutputScriptFromAddress(fromAddress);
    console.log('🔍 [P2WPKH DEBUG] ScriptPubKey do UTXO:', Array.from(utxoScriptPubKey).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log('🔍 [P2WPKH DEBUG] ScriptPubKeys correspondem?', Array.from(expectedScriptPubKey).map(b => b.toString(16).padStart(2, '0')).join('') === Array.from(utxoScriptPubKey).map(b => b.toString(16).padStart(2, '0')).join(''));

    // Assinar cada input
    const witnesses: Uint8Array[][] = [];
    for (let i = 0; i < inputs.length; i++) {
      const preimage = this.buildBIP143Preimage({
        inputs,
        outputs,
        inputIndex: i,
        scriptCode: finalScriptCode,
        hashType: 1 // SIGHASH_ALL
      });
      
      console.log('🔍 [BIP143 DEBUG] Preimage length:', preimage.length, 'bytes');
      console.log('🔍 [BIP143 DEBUG] Preimage hex:', Array.from(preimage).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 100) + '...');
      
      const digest = sha256(sha256(preimage));
      console.log('🔍 [BIP143 DEBUG] Digest:', Array.from(digest).map(b => b.toString(16).padStart(2, '0')).join(''));
      
      // Assinar
      const sigAny: any = secp.sign(digest, privateKey, { lowS: true });
      console.log('🔍 [SIGNATURE DEBUG] Tipo da assinatura:', typeof sigAny, sigAny.constructor.name);
      
      let der: Uint8Array;
      if (sigAny instanceof Uint8Array) {
        console.log('🔍 [SIGNATURE DEBUG] Assinatura compact (64 bytes):', Array.from(sigAny).map(b => b.toString(16).padStart(2, '0')).join(''));
        der = this.compactToDER(sigAny);
      } else if (sigAny && typeof sigAny.toDERRaw === 'function') {
        der = sigAny.toDERRaw();
      } else if (sigAny && typeof sigAny.toDERHex === 'function') {
        der = hexToBytes(sigAny.toDERHex());
      } else if (sigAny && typeof sigAny.toCompactRaw === 'function') {
        der = this.compactToDER(sigAny.toCompactRaw());
      } else if (sigAny && typeof sigAny.toCompactHex === 'function') {
        der = this.compactToDER(hexToBytes(sigAny.toCompactHex()));
      } else {
        console.error('❌ [SIGNATURE DEBUG] Formato não suportado:', typeof sigAny, sigAny);
        throw new Error('Formato de assinatura não suportado');
      }
      
      console.log('🔍 [SIGNATURE DEBUG] Assinatura DER length:', der.length, 'bytes');
      console.log('🔍 [SIGNATURE DEBUG] Assinatura DER:', Array.from(der).map(b => b.toString(16).padStart(2, '0')).join(''));
      
      // Verificar se a assinatura está sendo validada corretamente
      try {
        // Para validação, precisamos usar a assinatura compact (64 bytes), não DER
        let compactSig: Uint8Array;
        if (sigAny instanceof Uint8Array) {
          compactSig = sigAny; // Já é compact
        } else if (sigAny && typeof sigAny.toCompactRaw === 'function') {
          compactSig = sigAny.toCompactRaw();
        } else if (sigAny && typeof sigAny.toCompactHex === 'function') {
          compactSig = hexToBytes(sigAny.toCompactHex());
    } else {
          throw new Error('Não foi possível obter assinatura compact');
        }
        
        const isValid = secp.verify(compactSig, digest, publicKey);
        console.log('🔍 [SIGNATURE DEBUG] Assinatura válida?', isValid);
      } catch (error) {
        console.log('🔍 [SIGNATURE DEBUG] Erro na validação:', error);
      }
      
      // CORREÇÃO CRÍTICA: Assinatura no witness deve incluir o hash type como parte da assinatura
      const sigWithHashType = new Uint8Array(der.length + 1);
      sigWithHashType.set(der);
      sigWithHashType[der.length] = 0x01; // SIGHASH_ALL
      
      console.log('🔍 [SIGNATURE CRITICAL] Assinatura DER length:', der.length, 'bytes');
      console.log('🔍 [SIGNATURE CRITICAL] Assinatura com hash type length:', sigWithHashType.length, 'bytes (deve ser 72)');
      console.log('🔍 [SIGNATURE CRITICAL] Hash type embutido na assinatura:', sigWithHashType[sigWithHashType.length - 1].toString(16));
      console.log('🔍 [SIGNATURE CRITICAL] CORREÇÃO: Hash type deve estar embutido na assinatura, não separado!');
      console.log('🔍 [SIGNATURE CRITICAL] Assinatura completa (DER + hash type):', Array.from(sigWithHashType).map(b => b.toString(16).padStart(2, '0')).join(''));
      console.log('🔍 [SIGNATURE CRITICAL] Verificação: deve terminar em ...02 01');
      
      // CORREÇÃO CRÍTICA: Verificação específica do tamanho e último byte
      console.log('🔍 [SIGNATURE CRITICAL] TESTE RÁPIDO:');
      console.log('🔍 [SIGNATURE CRITICAL] Signature+HashType length:', sigWithHashType.length);
      console.log('🔍 [SIGNATURE CRITICAL] Last byte (should be 01):', sigWithHashType[sigWithHashType.length - 1].toString(16));
      console.log('🔍 [SIGNATURE CRITICAL] Verificação: length === 72?', sigWithHashType.length === 72);
      console.log('🔍 [SIGNATURE CRITICAL] Verificação: last byte === 0x01?', sigWithHashType[sigWithHashType.length - 1] === 0x01);
      
      if (sigWithHashType.length !== 72) {
        console.error('❌ [SIGNATURE CRITICAL] ERRO: sigWithHashType.length deve ser 72, mas é', sigWithHashType.length);
      }
      if (sigWithHashType[sigWithHashType.length - 1] !== 0x01) {
        console.error('❌ [SIGNATURE CRITICAL] ERRO: último byte deve ser 0x01, mas é 0x' + sigWithHashType[sigWithHashType.length - 1].toString(16));
      }
      
      // CORREÇÃO CRÍTICA: Ordem correta do witness P2WPKH
      const witness = [sigWithHashType, publicKey]; // [signature, publicKey] - ORDEM CORRETA
      console.log('🔍 [WITNESS DEBUG] Witness items:', witness.length);
      console.log('🔍 [WITNESS DEBUG] Item 0 (signature) length:', witness[0].length, 'bytes (deve ser 72)');
      console.log('🔍 [WITNESS DEBUG] Item 1 (publicKey) length:', witness[1].length, 'bytes (deve ser 33)');
      console.log('🔍 [WITNESS DEBUG] Signature with hash type:', Array.from(witness[0]).map(b => b.toString(16).padStart(2, '0')).join(''));
      console.log('🔍 [WITNESS DEBUG] Public key:', Array.from(witness[1]).map(b => b.toString(16).padStart(2, '0')).join(''));
      console.log('🔍 [WITNESS CRITICAL] Ordem correta: [signature, publicKey]');
      console.log('🔍 [WITNESS CRITICAL] CORREÇÃO: Assinatura deve ter 72 bytes (71 DER + 1 hash type)');
      
      witnesses.push(witness);
    }

    // Construir transação final
    const parts: Uint8Array[] = [];
    console.log('🔍 [PARTS DEBUG] Iniciando construção da transação - parts array vazio');
    
    // INVESTIGAÇÃO CRÍTICA: Verificar se o problema está na estrutura da transação SegWit
    console.log('🔍 [TX STRUCTURE CRITICAL] Verificando estrutura da transação SegWit...');
    console.log('🔍 [TX STRUCTURE CRITICAL] Legacy funciona, SegWit falha - diferença na estrutura!');
    
    // Version - Bitcoin usa version 1 em little-endian
    parts.push(new Uint8Array([0x01, 0x00, 0x00, 0x00]));
    console.log('🔍 [TX STRUCTURE DEBUG] Version: 01000000');
    
    // Marker e Flag para SegWit
    parts.push(new Uint8Array([0x00])); // marker
    parts.push(new Uint8Array([0x01])); // flag
    console.log('🔍 [TX STRUCTURE DEBUG] Marker: 00, Flag: 01');
    
    // Input count
    parts.push(this.toVarInt(inputs.length));
    
    // Inputs (sem scriptSig para SegWit) - CORREÇÃO CRÍTICA
    console.log('🔍 [P2WPKH DEBUG] Processando inputs:', inputs.length);
    console.log('🔍 [P2WPKH CRITICAL] CORREÇÃO: scriptSig deve ser vazio para P2WPKH!');
    for (const inp of inputs) {
      console.log('🔍 [P2WPKH DEBUG] Input:', { txid: inp.txid, vout: inp.vout });
      console.log('🔍 [TXID DEBUG] TXID original (da API):', inp.txid);
      const reversedTxid = reverse32(inp.txid);
      console.log('🔍 [TXID DEBUG] TXID após reverse32:', Array.from(reversedTxid).map(b => b.toString(16).padStart(2, '0')).join(''));
      console.log('🔍 [TXID DEBUG] TXID que será serializado:', Array.from(reversedTxid).map(b => b.toString(16).padStart(2, '0')).join(''));
      parts.push(reversedTxid);
      parts.push(u32LE(inp.vout));
      const emptyScriptSig = this.toVarInt(0); // scriptSig vazio - CRÍTICO para P2WPKH
      console.log('🔍 [P2WPKH CRITICAL] Empty scriptSig varint:', Array.from(emptyScriptSig).map(b => b.toString(16).padStart(2, '0')).join(''));
      parts.push(emptyScriptSig);
      parts.push(u32LE(0xffffffff));
      console.log('🔍 [P2WPKH CRITICAL] scriptSig vazio confirmado para P2WPKH');
      console.log('🔍 [P2WPKH CRITICAL] NÃO colocar pubkey+assinatura no input!');
    }
    
    // Output count
    parts.push(this.toVarInt(outputs.length));
    
    // Outputs
    for (const out of outputs) {
      parts.push(u64LE(out.value));
      parts.push(this.toVarInt(out.scriptPubKey.length));
      parts.push(out.scriptPubKey);
      console.log('🔍 [OUTPUT DEBUG] Output value:', out.value, 'scriptPubKey length:', out.scriptPubKey.length);
    }
    
    console.log('🔍 [STRUCTURE DEBUG] Outputs finalizados, iniciando witness serialization...');
    
    // Witness data - CORREÇÃO CRÍTICA: Separar witness do scriptSig
    console.log('🔍 [WITNESS SERIALIZATION] Total witnesses:', witnesses.length);
    console.log('🔍 [WITNESS CRITICAL] CORREÇÃO: Witness separado do scriptSig!');
    console.log('🔍 [WITNESS CRITICAL] Estrutura correta: [nItems + items] para cada input, sem witness count global');
    
    // CORREÇÃO CRÍTICA: Serialização SegWit correta - sem witness count global duplicado
    console.log('🔍 [WITNESS CRITICAL] CORREÇÃO: Serialização SegWit correta - sem witness count global duplicado');
    console.log('🔍 [WITNESS CRITICAL] Estrutura correta: [nItems + items] para cada input, sem witness count global');
    console.log('🔍 [WITNESS CRITICAL] IMPORTANTE: Não existe "witness count global" → o 00 01 (marker/flag) já diz que a TX tem witnesses');
    
    // CORREÇÃO CRÍTICA: Remover o "1 fantasma" que está sendo adicionado incorretamente
    console.log('🔍 [WITNESS CRITICAL] CORREÇÃO: Removendo o "1 fantasma" que está sendo adicionado incorretamente');
    console.log('🔍 [WITNESS CRITICAL] Estrutura esperada: [02] [48+sig] [21+pubkey] - SEM o 1 extra');
    
    for (let i = 0; i < witnesses.length; i++) {
      const witness = witnesses[i];
      console.log(`🔍 [WITNESS SERIALIZATION] Witness ${i}:`, witness.length, 'items');
      console.log(`🔍 [WITNESS CRITICAL] Witness ${i} ordem: [${witness[0].length} bytes, ${witness[1].length} bytes]`);
      
      // CORREÇÃO CRÍTICA: Para cada witness, adicionar apenas o número de itens
      const nItemsVarint = this.toVarInt(witness.length); // Número de itens no witness
      parts.push(nItemsVarint);
      console.log(`🔍 [WITNESS CRITICAL] Witness ${i} nItems varint:`, Array.from(nItemsVarint).map(b => b.toString(16).padStart(2, '0')).join(''));
      
      // CORREÇÃO CRÍTICA: Log antes da serialização para debug
      console.log('🔍 [WITNESS CRITICAL] TESTE RÁPIDO - Witness items:', {
        nItems: witness.length,
        sigLen: witness[0].length,  // deve ser 72
        pubLen: witness[1].length   // deve ser 33
      });
      
      // CORREÇÃO CRÍTICA: Verificação específica da witness antes da serialização
      console.log('🔍 [WITNESS CRITICAL] Witness check:', {
        nItems: witness.length,
        sigLen: witness[0].length, // deve ser 72
        pubLen: witness[1].length  // deve ser 33
      });
      
      // CORREÇÃO CRÍTICA: Serialização correta - apenas um varint por item
      console.log(`🔍 [WITNESS CRITICAL] CORREÇÃO: Serialização correta - apenas um varint por item`);
      console.log(`🔍 [WITNESS CRITICAL] Estrutura esperada: [02] [48+sig] [21+pubkey]`);
      
      for (let j = 0; j < witness.length; j++) {
        const item = witness[j];
        console.log(`🔍 [WITNESS SERIALIZATION] Item ${j}:`, item.length, 'bytes');
        
        // CORREÇÃO CRÍTICA: Usar varint real, não Buffer.from([len]) direto
        const itemLengthVarint = this.toVarInt(item.length); // Tamanho do item
        console.log(`🔍 [WITNESS CRITICAL] Item ${j} length:`, item.length, 'bytes');
        console.log(`🔍 [WITNESS CRITICAL] Item ${j} length varint hex:`, Array.from(itemLengthVarint).map(b => b.toString(16).padStart(2, '0')).join(''));
        console.log(`🔍 [WITNESS CRITICAL] Item ${j} length varint decimal:`, itemLengthVarint[0]);
        console.log(`🔍 [WITNESS CRITICAL] DEBUG: sig len ${item.length} → ${Buffer.from(itemLengthVarint).toString('hex')}`);
        console.log(`🔍 [WITNESS CRITICAL] CORREÇÃO: Comprimento deve ser ${item.length} (0x${item.length.toString(16)}), varint deve ser 0x${item.length.toString(16)}`);
        console.log(`🔍 [WITNESS CRITICAL] Se aparecer 48 para a assinatura → bug. O certo é 48 em hex (0x48), que é 72 decimal.`);
        
        // CORREÇÃO CRÍTICA: Verificar se o varint está correto
        if (j === 0 && item.length === 72) {
          console.log(`🔍 [WITNESS CRITICAL] VERIFICAÇÃO: Assinatura deve ter 72 bytes, varint deve ser 0x48`);
          console.log(`🔍 [WITNESS CRITICAL] Varint atual:`, Array.from(itemLengthVarint).map(b => b.toString(16).padStart(2, '0')).join(''));
          console.log(`🔍 [WITNESS CRITICAL] Varint esperado: 48`);
          if (itemLengthVarint[0] !== 0x48) {
            console.error(`❌ [WITNESS CRITICAL] ERRO: Varint incorreto! Deveria ser 0x48, mas é 0x${itemLengthVarint[0].toString(16)}`);
          }
        }
        
        // CORREÇÃO CRÍTICA: Verificar se a assinatura tem exatamente 72 bytes
        if (j === 0) {
          console.log(`🔍 [WITNESS CRITICAL] VERIFICAÇÃO FINAL: Assinatura deve ter 72 bytes`);
          console.log(`🔍 [WITNESS CRITICAL] Assinatura length:`, item.length);
          console.log(`🔍 [WITNESS CRITICAL] Assinatura hex:`, Array.from(item).map(b => b.toString(16).padStart(2, '0')).join(''));
          console.log(`🔍 [WITNESS CRITICAL] Último byte (deve ser 01):`, item[item.length - 1].toString(16));
          if (item.length !== 72) {
            console.error(`❌ [WITNESS CRITICAL] ERRO: Assinatura deve ter 72 bytes, mas tem ${item.length}`);
          }
          if (item[item.length - 1] !== 0x01) {
            console.error(`❌ [WITNESS CRITICAL] ERRO: Último byte deve ser 0x01, mas é 0x${item[item.length - 1].toString(16)}`);
          }
        }
        
        // CORREÇÃO CRÍTICA: Apenas um varint por item - sem duplicação
        console.log(`🔍 [WITNESS CRITICAL] CORREÇÃO: Apenas um varint por item - sem duplicação`);
        console.log(`🔍 [WITNESS CRITICAL] Adicionando: varint(${item.length}) + item(${item.length} bytes)`);
        parts.push(itemLengthVarint);
        parts.push(item); // Dados do item
      }
    }
    
    // LockTime - DEVE SER O ÚLTIMO CAMPO
    const locktime = u32LE(0);
    parts.push(locktime);
    console.log('🔍 [LOCKTIME DEBUG] Locktime adicionado:', Array.from(locktime).map(b => b.toString(16).padStart(2, '0')).join(''));
    console.log('🔍 [STRUCTURE DEBUG] Estrutura final: version + marker/flag + inputs + outputs + witnesses + locktime');
    
    console.log('🔍 [CONCAT DEBUG] Número de parts:', parts.length);
    console.log('🔍 [CONCAT DEBUG] Tamanhos dos parts:', parts.map(p => p.length));
    
    // CORREÇÃO CRÍTICA: Usar uma única variável para evitar duplicação
    const rawTx = concat(...parts);
    const rawTxHex = Buffer.from(rawTx).toString('hex');
    
    console.log('🔍 [RAW FINAL] Raw transaction length:', rawTx.length, 'bytes');
    console.log('🔍 [RAW FINAL] Raw transaction hex:', rawTxHex);
    console.log('🔍 [RAW FINAL] Hex string length:', rawTxHex.length, 'characters');
    
    // ✅ CORREÇÃO: Relaxar asserts de tamanho - assinaturas DER variam (71-72 bytes)
    console.log('🔍 [RAW FINAL] INFO: Tamanho pode variar devido a assinaturas DER (71-72 bytes)');
    console.log('🔍 [RAW FINAL] INFO: Tamanho esperado aproximado: ~224 bytes / ~448 chars');
    console.log('🔍 [RAW FINAL] INFO: O que importa é o nó aceitar a transação');
    
    if (rawTx.length >= 220 && rawTx.length <= 230) {
      console.log('✅ [RAW FINAL] SUCESSO: Tamanho dentro do esperado!', rawTx.length, 'bytes /', rawTxHex.length, 'chars');
    } else {
      console.log('⚠️ [RAW FINAL] AVISO: Tamanho fora do esperado, mas pode estar correto:', rawTx.length, 'bytes /', rawTxHex.length, 'chars');
    }
    
    return rawTxHex;
  }

  // Constrói e assina transação P2SH-P2WPKH (3...)
  private async buildAndSignP2SH_P2WPKH(params: {
    inputs: { txid: string; vout: number; value: number }[];
    outputs: { value: number; scriptPubKey: Uint8Array }[];
    privateKey: Uint8Array;
    publicKey: Uint8Array;
  }): Promise<string> {
    const { inputs, outputs, privateKey, publicKey } = params;
    
    const u32LE = (n: number): Uint8Array => new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
    const u64LE = (n: number): Uint8Array => {
      const b = new Uint8Array(8);
      // Para valores até 32 bits, usar apenas os primeiros 4 bytes
      b[0] = n & 0xff;
      b[1] = (n >> 8) & 0xff;
      b[2] = (n >> 16) & 0xff;
      b[3] = (n >> 24) & 0xff;
      // Os últimos 4 bytes ficam como 0
      return b;
    };
    const hexToBytes = (hex: string): Uint8Array => new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    const reverse32 = (hex: string): Uint8Array => {
      const bytes = hexToBytes(hex);
      return new Uint8Array(Array.from(bytes).reverse());
    };
    const concat = (...arrs: Uint8Array[]) => {
      const total = arrs.reduce((s, a) => s + a.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const a of arrs) { out.set(a, off); off += a.length; }
      return out;
    };

    // RedeemScript para P2SH-P2WPKH: OP_0 0x14 <20-byte hash160>
    const hash160 = ripemd160(sha256(publicKey));
    const redeemScript = new Uint8Array([0x00, 0x14, ...hash160]);
    
    // ScriptCode para P2SH-P2WPKH: OP_DUP OP_HASH160 0x14 <20-byte> OP_EQUALVERIFY OP_CHECKSIG
    const scriptCode = new Uint8Array([0x76, 0xa9, 0x14, ...hash160, 0x88, 0xac]);

    // Assinar cada input
    const witnesses: Uint8Array[][] = [];
    for (let i = 0; i < inputs.length; i++) {
      const preimage = this.buildBIP143Preimage({
        inputs,
        outputs,
        inputIndex: i,
        scriptCode,
        hashType: 1 // SIGHASH_ALL
      });
      
      console.log('🔍 [BIP143 DEBUG] Preimage length:', preimage.length, 'bytes');
      console.log('🔍 [BIP143 DEBUG] Preimage hex:', Array.from(preimage).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 100) + '...');
      
      const digest = sha256(sha256(preimage));
      console.log('🔍 [BIP143 DEBUG] Digest:', Array.from(digest).map(b => b.toString(16).padStart(2, '0')).join(''));
      
      // Assinar
      const sigAny: any = secp.sign(digest, privateKey, { lowS: true });
      console.log('🔍 [SIGNATURE DEBUG] Tipo da assinatura:', typeof sigAny, sigAny.constructor.name);
      
      let der: Uint8Array;
      if (sigAny instanceof Uint8Array) {
        console.log('🔍 [SIGNATURE DEBUG] Assinatura compact (64 bytes):', Array.from(sigAny).map(b => b.toString(16).padStart(2, '0')).join(''));
        der = this.compactToDER(sigAny);
      } else if (sigAny && typeof sigAny.toDERRaw === 'function') {
        der = sigAny.toDERRaw();
      } else if (sigAny && typeof sigAny.toDERHex === 'function') {
        der = hexToBytes(sigAny.toDERHex());
      } else if (sigAny && typeof sigAny.toCompactRaw === 'function') {
        der = this.compactToDER(sigAny.toCompactRaw());
      } else if (sigAny && typeof sigAny.toCompactHex === 'function') {
        der = this.compactToDER(hexToBytes(sigAny.toCompactHex()));
      } else {
        console.error('❌ [SIGNATURE DEBUG] Formato não suportado:', typeof sigAny, sigAny);
        throw new Error('Formato de assinatura não suportado');
      }
      
      console.log('🔍 [SIGNATURE DEBUG] Assinatura DER length:', der.length, 'bytes');
      console.log('🔍 [SIGNATURE DEBUG] Assinatura DER:', Array.from(der).map(b => b.toString(16).padStart(2, '0')).join(''));
      
      // Verificar se a assinatura está sendo validada corretamente
      try {
        // Para validação, precisamos usar a assinatura compact (64 bytes), não DER
        let compactSig: Uint8Array;
        if (sigAny instanceof Uint8Array) {
          compactSig = sigAny; // Já é compact
        } else if (sigAny && typeof sigAny.toCompactRaw === 'function') {
          compactSig = sigAny.toCompactRaw();
        } else if (sigAny && typeof sigAny.toCompactHex === 'function') {
          compactSig = hexToBytes(sigAny.toCompactHex());
        } else {
          throw new Error('Não foi possível obter assinatura compact');
        }
        
        const isValid = secp.verify(compactSig, digest, publicKey);
        console.log('🔍 [SIGNATURE DEBUG] Assinatura válida?', isValid);
      } catch (error) {
        console.log('🔍 [SIGNATURE DEBUG] Erro na validação:', error);
      }
      
      const sigWithHashType = new Uint8Array(der.length + 1);
      sigWithHashType.set(der);
      sigWithHashType[der.length] = 0x01; // SIGHASH_ALL
      
      // Witness para P2SH-P2WPKH: [signature, publicKey]
      witnesses.push([sigWithHashType, publicKey]);
    }

    // Construir transação final
    const parts: Uint8Array[] = [];
    
    // Version - Bitcoin usa version 1 em little-endian
    parts.push(new Uint8Array([0x01, 0x00, 0x00, 0x00]));
    
    // Marker e Flag para SegWit
    parts.push(new Uint8Array([0x00])); // marker
    parts.push(new Uint8Array([0x01])); // flag
    
    // Input count
    parts.push(this.toVarInt(inputs.length));
    
    // Helper para pushData
    const pushData = (data: Uint8Array): Uint8Array => {
      if (data.length < 0x4c) return new Uint8Array([data.length, ...data]);
      if (data.length <= 0xff) return new Uint8Array([0x4c, data.length, ...data]);
      if (data.length <= 0xffff) return new Uint8Array([0x4d, data.length & 0xff, (data.length >> 8) & 0xff, ...data]);
      throw new Error('pushData too large');
    };

    // Inputs (com redeemScript no scriptSig) - CORREÇÃO: P2SH-P2WPKH usa pushData(redeemScript)
    console.log('🔍 [P2SH-P2WPKH CRITICAL] CORREÇÃO: P2SH-P2WPKH usa pushData(redeemScript) no scriptSig!');
    for (const inp of inputs) {
      parts.push(reverse32(inp.txid));
      parts.push(u32LE(inp.vout));
      
      // ✅ CORREÇÃO: scriptSig deve ser pushData(redeemScript), não apenas redeemScript
      const scriptSig = pushData(redeemScript);
      parts.push(this.toVarInt(scriptSig.length));
      parts.push(scriptSig);
      parts.push(u32LE(0xffffffff));
      console.log('🔍 [P2SH-P2WPKH CRITICAL] scriptSig com pushData(redeemScript) confirmado para P2SH-P2WPKH');
    }
    
    // Output count
    parts.push(this.toVarInt(outputs.length));
    
    // Outputs
    for (const out of outputs) {
      parts.push(u64LE(out.value));
      parts.push(this.toVarInt(out.scriptPubKey.length));
      parts.push(out.scriptPubKey);
    }
    
    // Witness data - Para cada input, serializar witness
    console.log('🔍 [WITNESS SERIALIZATION] Total witnesses:', witnesses.length);
    for (let i = 0; i < witnesses.length; i++) {
      const witness = witnesses[i];
      console.log(`🔍 [WITNESS SERIALIZATION] Witness ${i}:`, witness.length, 'items');
      parts.push(this.toVarInt(witness.length)); // Número de itens no witness
      for (let j = 0; j < witness.length; j++) {
        const item = witness[j];
        console.log(`🔍 [WITNESS SERIALIZATION] Item ${j}:`, item.length, 'bytes');
        parts.push(this.toVarInt(item.length)); // Tamanho do item
        parts.push(item); // Dados do item
      }
    }
    
    // LockTime
    parts.push(u32LE(0));
    
    const raw = concat(...parts);
    const hex = Array.from(raw).map((b) => b.toString(16).padStart(2, '0')).join('');
    return hex;
  }

  // Assinador/serializador Legacy P2PKH
  private async buildAndSignLegacyP2PKH(params: {
    inputs: { txid: string; vout: number; value: number }[];
    outputs: { value: number; scriptPubKey: Uint8Array }[];
    privateKey: Uint8Array;
    publicKey: Uint8Array;
  }): Promise<string> {
    const { inputs, outputs, privateKey, publicKey } = params;

    // Helpers
    const toVarInt = (n: number): Uint8Array => {
      if (n < 0xfd) return new Uint8Array([n]);
      if (n <= 0xffff) return new Uint8Array([0xfd, n & 0xff, (n >> 8) & 0xff]);
      if (n <= 0xffffffff) return new Uint8Array([0xfe, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
      const b = new Uint8Array(9);
      b[0] = 0xff;
      let x = BigInt(n);
      for (let i = 0; i < 8; i++) { b[1 + i] = Number((x >> BigInt(8 * i)) & BigInt(0xff)); }
      return b;
    };
    const u32LE = (n: number): Uint8Array => new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
    const u64LE = (n: number): Uint8Array => {
      let x = BigInt(n);
      const b = new Uint8Array(8);
      for (let i = 0; i < 8; i++) b[i] = Number((x >> BigInt(8 * i)) & BigInt(0xff));
      return b;
    };
    const concat = (...arrs: Uint8Array[]) => {
      const total = arrs.reduce((s, a) => s + a.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const a of arrs) { out.set(a, off); off += a.length; }
      return out;
    };
    const hexToBytes = (hex: string): Uint8Array => new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    const reverse32 = (hex: string): Uint8Array => {
      const bytes = hexToBytes(hex);
      return new Uint8Array(Array.from(bytes).reverse());
    };

    // script builder helpers
    const pushData = (data: Uint8Array): Uint8Array => {
      if (data.length < 0x4c) return new Uint8Array([data.length, ...data]);
      if (data.length <= 0xff) return new Uint8Array([0x4c, data.length, ...data]);
      if (data.length <= 0xffff) return new Uint8Array([0x4d, data.length & 0xff, (data.length >> 8) & 0xff, ...data]);
      // not expected for p2pkh
      throw new Error('pushData too large');
    };

    // scriptCode for signing (P2PKH): OP_DUP OP_HASH160 0x14 <20-byte> OP_EQUALVERIFY OP_CHECKSIG
    const scriptPubKeyFromPubkey = (pubkey: Uint8Array): Uint8Array => {
      const h160 = ripemd160(sha256(pubkey));
      return new Uint8Array([0x76, 0xa9, 0x14, ...h160, 0x88, 0xac]);
    };

    const version = u32LE(1);
    const locktime = u32LE(0);
    const hashType = u32LE(1); // SIGHASH_ALL

    const scriptCode = scriptPubKeyFromPubkey(publicKey);

    // Build preimage per input and sign
    const sigs: Uint8Array[] = [];
    for (let idx = 0; idx < inputs.length; idx++) {
      const inParts: Uint8Array[] = [];
      inParts.push(version);
      inParts.push(toVarInt(inputs.length));
      for (let i = 0; i < inputs.length; i++) {
        const inp = inputs[i];
        inParts.push(reverse32(inp.txid));
        inParts.push(u32LE(inp.vout));
        if (i === idx) {
          inParts.push(toVarInt(scriptCode.length));
          inParts.push(scriptCode);
        } else {
          inParts.push(toVarInt(0));
        }
        inParts.push(u32LE(0xffffffff));
      }
      // outputs
      inParts.push(toVarInt(outputs.length));
      for (const o of outputs) {
        inParts.push(u64LE(o.value));
        inParts.push(toVarInt(o.scriptPubKey.length));
        inParts.push(o.scriptPubKey);
      }
      inParts.push(locktime);
      inParts.push(hashType);

      const preimage = concat(...inParts);
      const digest = sha256(sha256(preimage));

      // ECDSA (compact) -> DER + sighash byte 0x01 (async)
      if (digest.length !== 32) throw new Error('digest precisa ter 32 bytes');
      if (privateKey.length !== 32) throw new Error('privateKey precisa ter 32 bytes');
      const sigAny: any = secp.sign(digest, privateKey, { lowS: true });
      let der: Uint8Array;
      if (sigAny instanceof Uint8Array) {
        // @noble/secp256k1 → compact bytes (64)
        der = this.compactToDER(sigAny);
      } else if (sigAny && typeof sigAny.toDERRaw === 'function') {
        // @noble/curves Signature → bytes
        der = sigAny.toDERRaw();
      } else if (sigAny && typeof sigAny.toDERHex === 'function') {
        // @noble/curves Signature → hex string
        der = hexToBytes(sigAny.toDERHex());
      } else if (sigAny && typeof sigAny.toCompactRaw === 'function') {
        der = this.compactToDER(sigAny.toCompactRaw());
      } else if (sigAny && typeof sigAny.toCompactHex === 'function') {
        der = this.compactToDER(hexToBytes(sigAny.toCompactHex()));
      } else {
        throw new Error('Formato de assinatura não suportado');
      }
      const sigWithHashType = new Uint8Array(der.length + 1);
      sigWithHashType.set(der);
      sigWithHashType[der.length] = 0x01; // SIGHASH_ALL
      sigs.push(sigWithHashType);
    }

    // Build final TX with scriptSig for each input
    const outParts: Uint8Array[] = [];
    outParts.push(version);
    outParts.push(toVarInt(inputs.length));
    for (let i = 0; i < inputs.length; i++) {
      const inp = inputs[i];
      outParts.push(reverse32(inp.txid));
      outParts.push(u32LE(inp.vout));
      const sig = sigs[i];
      const pub = publicKey;
      const scriptSig = concat(pushData(sig), pushData(pub));
      outParts.push(toVarInt(scriptSig.length));
      outParts.push(scriptSig);
      outParts.push(u32LE(0xffffffff));
    }
    outParts.push(toVarInt(outputs.length));
    for (const o of outputs) {
      outParts.push(u64LE(o.value));
      outParts.push(toVarInt(o.scriptPubKey.length));
      outParts.push(o.scriptPubKey);
    }
    outParts.push(locktime);

    const raw = concat(...outParts);
    const hex = Array.from(raw).map((b) => b.toString(16).padStart(2, '0')).join('');
    return hex;
  }

  // Gera todos os tipos de endereços para uma chave
  generateAllAddresses(publicKey: Uint8Array): { p2pkh: string; p2sh: string; bech32: string } {
    const all = {
      p2pkh: this.generateAddress(publicKey, 'p2pkh'),
      p2sh: this.generateAddress(publicKey, 'p2sh'),
      bech32: this.generateAddress(publicKey, 'bech32')
    };
    console.log('🏷️ [ADDRESSES GENERATED]', all);
    return all;
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

  // Obter estimativas detalhadas de taxa com tempo de confirmação
  async getDetailedFeeEstimates(): Promise<FeeEstimate[]> {
    try {
      const fees = await this.getNetworkFees();
      return [
        {
          satPerVByte: fees.economy_fee, // Corrigido: usar sat/vbyte
          estimatedTime: '2-6 horas',
          description: 'Econômica',
          priority: 'economy'
        },
        {
          satPerVByte: fees.hour_fee, // Corrigido: usar sat/vbyte
          estimatedTime: '30-60 minutos',
          description: 'Padrão',
          priority: 'standard'
        },
        {
          satPerVByte: fees.fastest_fee, // Corrigido: usar sat/vbyte
          estimatedTime: '10-30 minutos',
          description: 'Rápida',
          priority: 'fast'
        }
      ];
    } catch (error) {
      console.error('❌ Erro ao obter estimativas detalhadas:', error);
      // Fallback para valores padrão
      return [
        {
          satPerVByte: 1, // Corrigido: usar sat/vbyte
          estimatedTime: '2-6 horas',
          description: 'Econômica',
          priority: 'economy'
        },
        {
          satPerVByte: 5, // Corrigido: usar sat/vbyte
          estimatedTime: '30-60 minutos',
          description: 'Padrão',
          priority: 'standard'
        },
        {
          satPerVByte: 10, // Corrigido: usar sat/vbyte
          estimatedTime: '10-30 minutos',
          description: 'Rápida',
          priority: 'fast'
        }
      ];
    }
  }

  // Calcular taxa ótima baseada na prioridade
  calculateOptimalFee(
    priority: FeePriority,
    customRate?: number,
    networkFees?: { economy_fee: number; hour_fee: number; fastest_fee: number }
  ): number {
    if (priority === FeePriority.CUSTOM && customRate) {
      return customRate;
    }
    
    if (!networkFees) {
      // Fallback rates
      const fallbackRates: Record<FeePriority, number> = {
        [FeePriority.ECONOMY]: 1,
        [FeePriority.STANDARD]: 5,
        [FeePriority.FAST]: 10,
        [FeePriority.CUSTOM]: 5 // Default para custom
      };
      return fallbackRates[priority];
    }
    
    const rates: Record<FeePriority, number> = {
      [FeePriority.ECONOMY]: networkFees.economy_fee,
      [FeePriority.STANDARD]: networkFees.hour_fee,
      [FeePriority.FAST]: networkFees.fastest_fee,
      [FeePriority.CUSTOM]: 5 // Default para custom
    };
    
    return rates[priority] || 5;
  }

  // Estimar tempo de confirmação baseado na taxa
  estimateConfirmationTime(satPerVByte: number): string {
    if (satPerVByte >= 20) return '10-30 minutos';
    if (satPerVByte >= 10) return '30-60 minutos';
    if (satPerVByte >= 5) return '1-2 horas';
    if (satPerVByte >= 2) return '2-6 horas';
    return '6+ horas';
  }

  // Converter sat/byte para sat/vbyte baseado no tipo de endereço
  convertSatPerByteToVByte(satPerByte: number, addressType: 'p2pkh' | 'p2sh' | 'p2wpkh'): number {
    switch (addressType) {
      case 'p2pkh':
        // Legacy: 1 byte = 1 vbyte
        return satPerByte;
      case 'p2sh':
        // P2SH-P2WPKH: witness discount aplicado
        return satPerByte;
      case 'p2wpkh':
        // Native SegWit: witness discount aplicado
        return satPerByte;
      default:
        return satPerByte;
    }
  }

  // Obter tamanho estimado da transação baseado no tipo de endereço
  getEstimatedTransactionSize(addressType: 'p2pkh' | 'p2sh' | 'p2wpkh', numInputs: number = 1, numOutputs: number = 2): { size: number; vSize: number } {
    const inputSizes = {
      p2pkh: 148,    // Legacy P2PKH
      p2sh: 91,      // P2SH-P2WPKH (witness discount)
      p2wpkh: 68     // Native SegWit P2WPKH
    };
    
    const outputSize = 34; // P2PKH output
    const overhead = 10;   // Version, locktime, etc.
    
    const inputSize = inputSizes[addressType];
    const totalSize = overhead + (numInputs * inputSize) + (numOutputs * outputSize);
    
    // Para SegWit, o vSize é menor devido ao witness discount
    let vSize = totalSize;
    if (addressType === 'p2wpkh') {
      // Native SegWit: witness data conta como 1/4
      const witnessSize = 107; // signature + pubkey
      vSize = overhead + (numInputs * 41) + (numOutputs * outputSize) + (numInputs * witnessSize / 4);
    } else if (addressType === 'p2sh') {
      // P2SH-P2WPKH: witness discount parcial
      vSize = overhead + (numInputs * 64) + (numOutputs * outputSize);
    }
    
    return { size: totalSize, vSize: Math.ceil(vSize) };
  }

  // Validar taxa customizada com contexto avançado
  validateCustomFeeRate(rate: number, context?: FeeValidationContext): FeeValidationResult {
    // Validações básicas
    const basicValidation = this.validateBasicFeeRate(rate);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // Validações contextuais se contexto fornecido
    if (context) {
      const contextualValidation = this.validateContextualFeeRate(rate, context);
      if (!contextualValidation.isValid) {
        return contextualValidation;
      }
    }

    return { isValid: true, severity: 'info' };
  }

  // Validação básica de taxa
  private validateBasicFeeRate(rate: number): FeeValidationResult {
    const minRate = 1; // 1 sat/byte mínimo absoluto
    const maxRate = 200; // 200 sat/byte máximo (proteção contra erros)
    
    if (rate < minRate) {
      return {
        isValid: false,
        message: `Taxa muito baixa. Mínimo: ${minRate} sat/byte`,
        severity: 'error',
        suggestedRate: minRate
      };
    }
    
    if (rate > maxRate) {
      return {
        isValid: false,
        message: `Taxa muito alta. Máximo: ${maxRate} sat/byte`,
        severity: 'error',
        suggestedRate: maxRate
      };
    }

    // Avisos para taxas extremas
    if (rate < 2) {
      return {
        isValid: true,
        warning: 'Taxa muito baixa pode resultar em confirmação muito lenta (6+ horas)',
        severity: 'warning',
        suggestedRate: 5
      };
    }

    if (rate > 50) {
      return {
        isValid: true,
        warning: 'Taxa muito alta. Considere usar uma taxa menor para economizar',
        severity: 'warning'
      };
    }
    
    return { isValid: true, severity: 'info' };
  }

  // Validação contextual baseada no valor e contexto da transação
  private validateContextualFeeRate(rate: number, context: FeeValidationContext): FeeValidationResult {
    const { amount, txSize = 250, txVSize, addressType = 'p2wpkh', networkFees, urgency = 'medium' } = context;
    
    // Usar vSize se disponível, senão calcular baseado no tipo de endereço
    const effectiveSize = txVSize || this.getEstimatedTransactionSize(addressType).vSize;
    
    // Calcular taxa total estimada usando vSize
    const estimatedFee = rate * effectiveSize;
    const feePercentage = (estimatedFee / amount) * 100;
    
    // Validação: Taxa não pode ser maior que 50% do valor
    if (feePercentage > 50) {
      return {
        isValid: false,
        message: `Taxa muito alta (${feePercentage.toFixed(1)}% do valor). Máximo: 50%`,
        severity: 'error',
        suggestedRate: Math.floor((amount * 0.3) / txSize) // 30% do valor
      };
    }

    // Validação: Taxa não pode ser maior que 20% para valores pequenos
    if (amount < 10000 && feePercentage > 20) { // < 0.0001 BTC
      return {
        isValid: false,
        message: `Taxa muito alta para valor pequeno (${feePercentage.toFixed(1)}%). Máximo: 20%`,
        severity: 'error',
        suggestedRate: Math.floor((amount * 0.15) / txSize) // 15% do valor
      };
    }

    // Validação: Taxa mínima baseada na rede
    if (networkFees) {
      const minNetworkRate = Math.min(networkFees.economy_fee, networkFees.hour_fee);
      if (rate < minNetworkRate) {
        return {
          isValid: false,
          message: `Taxa abaixo do mínimo da rede (${minNetworkRate} sat/byte). Pode não ser confirmada.`,
          severity: 'error',
          suggestedRate: minNetworkRate
        };
      }
    }

    // Avisos baseados no contexto
    const warnings: string[] = [];
    
    // Aviso para taxas muito baixas em valores altos
    if (amount > 1000000 && rate < 5) { // > 0.01 BTC
      warnings.push('Para valores altos, considere usar taxa mais alta para segurança');
    }

    // Aviso para taxas muito altas em valores baixos
    if (amount < 10000 && rate > 10) { // < 0.0001 BTC
      warnings.push('Taxa alta para valor pequeno. Considere usar taxa econômica');
    }

    // Aviso para urgência alta com taxa baixa
    if (urgency === 'high' && rate < 10) {
      warnings.push('Para confirmação rápida, use taxa mais alta (10+ sat/byte)');
    }

    // Aviso para taxa muito baixa que pode travar
    if (rate < 3 && amount > 100000) { // > 0.001 BTC
      warnings.push('Taxa muito baixa pode resultar em transação não confirmada');
    }

    if (warnings.length > 0) {
      return {
        isValid: true,
        warning: warnings.join('. '),
        severity: 'warning'
      };
    }

    return { isValid: true, severity: 'info' };
  }

  // Obter sugestão inteligente de taxa baseada no valor
  getSmartFeeSuggestion(amount: number, networkFees?: { economy_fee: number; hour_fee: number; fastest_fee: number }): string {
    const amountInBTC = amount / 100000000;
    
    if (amountInBTC >= 0.1) {
      return 'Para valores altos, recomendamos taxa rápida para segurança';
    } else if (amountInBTC >= 0.01) {
      return 'Taxa padrão é adequada para este valor';
    } else {
      return 'Taxa econômica é suficiente para valores pequenos';
    }
  }

  // Validar se a taxa pode resultar em transação não confirmada
  validateFeeForConfirmation(rate: number, networkFees?: { economy_fee: number; hour_fee: number; fastest_fee: number }): FeeValidationResult {
    if (!networkFees) {
      return {
        isValid: true,
        warning: 'Não foi possível verificar taxas da rede',
        severity: 'warning'
      };
    }

    // Taxa muito baixa comparada com a rede
    if (rate < networkFees.economy_fee * 0.5) {
      return {
        isValid: false,
        message: `Taxa muito baixa (${rate} vs ${networkFees.economy_fee} da rede). Pode não ser confirmada.`,
        severity: 'error',
        suggestedRate: networkFees.economy_fee
      };
    }

    // Taxa baixa mas ainda aceitável
    if (rate < networkFees.economy_fee) {
      return {
        isValid: true,
        warning: `Taxa baixa (${rate} vs ${networkFees.economy_fee} da rede). Confirmação pode ser lenta.`,
        severity: 'warning',
        suggestedRate: networkFees.economy_fee
      };
    }

    return { isValid: true, severity: 'info' };
  }

  // Calcular taxa mínima segura baseada no valor
  calculateMinimumSafeFee(amount: number, txSize: number = 250): number {
    // Taxa mínima: 1% do valor ou 1 sat/byte, o que for maior
    const minFeePercentage = amount * 0.01; // 1% do valor
    const minFeePerByte = Math.ceil(minFeePercentage / txSize);
    
    return Math.max(minFeePerByte, 1); // Mínimo 1 sat/byte
  }

  // Detectar taxas suspeitas (possíveis erros de digitação)
  detectSuspiciousFee(rate: number, context: FeeValidationContext): FeeValidationResult {
    const { amount, txSize = 250 } = context;
    const estimatedFee = rate * txSize;
    
    // Taxa que é maior que o valor da transação
    if (estimatedFee > amount) {
      return {
        isValid: false,
        message: `Taxa (${estimatedFee} sats) é maior que o valor da transação (${amount} sats)`,
        severity: 'error',
        suggestedRate: Math.floor(amount * 0.1 / txSize) // 10% do valor
      };
    }

    // Taxa que é 90% ou mais do valor
    if (estimatedFee >= amount * 0.9) {
      return {
        isValid: false,
        message: `Taxa muito alta (${(estimatedFee/amount*100).toFixed(1)}% do valor). Verifique se está correto.`,
        severity: 'error',
        suggestedRate: Math.floor(amount * 0.1 / txSize) // 10% do valor
      };
    }

    // Taxa muito redonda (possível erro de digitação)
    if (rate >= 10 && rate % 10 === 0 && rate > 50) {
      return {
        isValid: true,
        warning: `Taxa muito alta (${rate} sat/byte). Verifique se não é um erro de digitação.`,
        severity: 'warning'
      };
    }

    return { isValid: true, severity: 'info' };
  }

  // Validar taxa completa com todas as verificações
  validateFeeComprehensive(rate: number, context: FeeValidationContext): FeeValidationResult {
    // 1. Validação básica
    const basicValidation = this.validateCustomFeeRate(rate, context);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // 2. Validação de confirmação
    const confirmationValidation = this.validateFeeForConfirmation(rate, context.networkFees);
    if (!confirmationValidation.isValid) {
      return confirmationValidation;
    }

    // 3. Detecção de taxas suspeitas
    const suspiciousValidation = this.detectSuspiciousFee(rate, context);
    if (!suspiciousValidation.isValid) {
      return suspiciousValidation;
    }

    // 4. Combinar avisos se houver
    const warnings: string[] = [];
    if (basicValidation.warning) warnings.push(basicValidation.warning);
    if (confirmationValidation.warning) warnings.push(confirmationValidation.warning);
    if (suspiciousValidation.warning) warnings.push(suspiciousValidation.warning);

    if (warnings.length > 0) {
      return {
        isValid: true,
        warning: warnings.join('. '),
        severity: 'warning'
      };
    }

    return { isValid: true, severity: 'info' };
  }

  async sendTransaction(fromAddress: string, toAddress: string, amount: number, feeRate: number): Promise<string> {
    console.log('🚀 [SEND PREVIEW] Iniciando envio...', { fromAddress, toAddress, amount_sats: amount, feeRate_sat_per_vb: feeRate });

    // Validar endereço de destino
    const isValid = this.validateAddress(toAddress);
    console.log('🧪 [ADDRESS VALIDATION]', { toAddress, isValid });
    if (!isValid) {
      console.error('❌ Endereço de destino inválido:', toAddress);
      throw new Error('Endereço de destino inválido');
    }

    // Logar saldo atual do destino (para confirmação visual) - não bloqueante
    try {
      const destBalance = await this.getAddressBalance(toAddress);
      console.log('📦 [DEST BALANCE BEFORE]', { toAddress, balance_sats: destBalance.balance });
    } catch (e) {
      console.warn('⚠️ Não foi possível obter saldo do destino (não bloqueante).');
    }

    // Suportamos envio a partir de qualquer tipo de endereço: Legacy (1...), P2SH (3...), ou Bech32 (bc1...)
    const fromAddressInfo = this.getAddressInfo(fromAddress);
    console.log('🔍 [ADDRESS TYPE] Endereço de origem:', fromAddressInfo.type);
    
    // Destino pode ser P2PKH (1...), P2SH (3...) ou Bech32 P2WPKH (bc1...)

    // 1) Obter UTXOs do remetente
    console.log('🔍 [UTXO] Buscando UTXOs para', fromAddress);
    const { utxos } = await bitcoinApiService.getUTXOs(fromAddress);
    console.log('✅ [UTXO] Encontrados:', utxos.length);
    if (!utxos || utxos.length === 0) {
      throw new Error('Sem UTXOs disponíveis para gastar');
    }

    // ✅ CORREÇÃO CRÍTICA: Log detalhado dos UTXOs recebidos da API
    console.log('🔍 [UTXO CRITICAL] UTXOs recebidos da API:');
    utxos.forEach((utxo, index) => {
      console.log(`🔍 [UTXO CRITICAL] UTXO ${index}:`, {
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value,
        value_sats: utxo.value,
        value_btc: (utxo.value / 100000000).toFixed(8),
        script_pub_key: utxo.script_pub_key,
        address: utxo.address,
        confirmations: utxo.confirmations
      });
      
      // ✅ INVESTIGAÇÃO: Extrair hash160 do script_pub_key do UTXO
      if (utxo.script_pub_key && utxo.script_pub_key.length >= 44) {
        const utxoHash160 = utxo.script_pub_key.substring(4, 44); // Pular OP_0 (00) e OP_PUSH20 (14)
        console.log(`🔍 [HASH160 INVESTIGATION] UTXO ${index} hash160:`, utxoHash160);
        console.log(`🔍 [HASH160 INVESTIGATION] UTXO ${index} script_pub_key:`, utxo.script_pub_key);
        
        // ✅ CORREÇÃO CRÍTICA: Para P2WPKH, o script_pub_key deve ser 0014<hash160>
        // Se a API retornar formato incorreto, vamos corrigir baseado no endereço
        const expectedScriptPubKey = `0014${utxoHash160}`;
        console.log(`🔍 [SCRIPT CORRECTION] Script pub key esperado:`, expectedScriptPubKey);
        console.log(`🔍 [SCRIPT CORRECTION] Script pub key da API:`, utxo.script_pub_key);
        
        if (utxo.script_pub_key !== expectedScriptPubKey) {
          console.log(`⚠️ [SCRIPT CORRECTION] API retornou script pub key incorreto!`);
          console.log(`⚠️ [SCRIPT CORRECTION] Usando script pub key correto:`, expectedScriptPubKey);
          
          // ✅ CORREÇÃO CRÍTICA: Reconstruir o script pub key baseado no endereço
          const addressInfo = this.getAddressInfo(utxo.address);
          if (addressInfo.type === 'p2wpkh') {
            const correctScriptPubKey = this.buildOutputScriptFromAddress(utxo.address);
            const correctScriptPubKeyHex = Array.from(correctScriptPubKey).map(b => b.toString(16).padStart(2, '0')).join('');
            console.log(`🔧 [SCRIPT CORRECTION] Script pub key correto baseado no endereço:`, correctScriptPubKeyHex);
            utxo.script_pub_key = correctScriptPubKeyHex;
          }
        }
      }
    });

    // 2) Seleção simples de moedas e estimativa de taxa
    const DUST_LIMIT = 546;
    const OVERHEAD_VBYTES = 10;
    
    // Estimativas de vbytes por tipo de input
    const INPUT_VBYTES = {
      p2pkh: 148,    // Legacy P2PKH
      p2sh: 91,      // P2SH-P2WPKH (witness discount)
      p2wpkh: 68     // Native SegWit P2WPKH
    };
    const OUTPUT_VBYTES = 34;   // estimativa P2PKH

    let selected: { txid: string; vout: number; value: number }[] = [];
    let totalIn = 0;
    let numOutputs = 2; // destino + troco (troco pode virar 0)

    for (const u of utxos) {
      // ✅ CORREÇÃO CRÍTICA: Log detalhado do UTXO para verificar valor
      console.log('🔍 [UTXO CRITICAL] UTXO encontrado:', {
        txid: u.txid,
        vout: u.vout,
        value: u.value,
        value_sats: u.value,
        value_btc: (u.value / 100000000).toFixed(8)
      });
      
      selected.push({ txid: u.txid, vout: u.vout, value: u.value });
      totalIn += u.value;
      const inputVBytes = INPUT_VBYTES[fromAddressInfo.type];
      const estVBytes = OVERHEAD_VBYTES + selected.length * inputVBytes + numOutputs * OUTPUT_VBYTES;
      const estFee = feeRate * estVBytes;
      
      console.log('🔍 [UTXO CRITICAL] Progresso da seleção:', {
        totalIn,
        amount,
        estFee,
        needsMore: totalIn < amount + estFee
      });
      
      if (totalIn >= amount + estFee) break;
    }
    if (totalIn < amount) {
      throw new Error('Saldo insuficiente para o valor solicitado');
    }

    // Recalcular fee e troco com seleção final
    const inputVBytes = INPUT_VBYTES[fromAddressInfo.type];
    const finalVBytes = OVERHEAD_VBYTES + selected.length * inputVBytes + numOutputs * OUTPUT_VBYTES;
    let fee = feeRate * finalVBytes;
    let change = totalIn - amount - fee;
    if (change > 0 && change < DUST_LIMIT) {
      // adicionar troco pequeno à taxa
      fee += change;
      change = 0;
      numOutputs = 1;
    }
    if (amount + fee > totalIn) {
      throw new Error('Saldo insuficiente após taxa');
    }

    console.log('🧮 [FEE] vbytes:', finalVBytes, 'feeRate:', feeRate, 'fee:', fee, 'troco:', change);

    // 3) Construir e assinar transação P2PKH
    if (!this.root) throw new Error('Wallet não inicializada');
    const key = this.getKey();
    const privateKeyHex = key.privateKey;
    const privateKey = Uint8Array.from(Buffer.from(privateKeyHex, 'hex'));
    const publicKey = secp.getPublicKey(privateKey, true);
    
    console.log('🔑 [KEY DEBUG] Chave pública derivada:', Buffer.from(publicKey).toString('hex'));
    console.log('🔑 [KEY DEBUG] Chave pública esperada:', key.publicKey);
    console.log('🔑 [KEY DEBUG] Chaves correspondem?', Buffer.from(publicKey).toString('hex') === key.publicKey);
    
    // ✅ INVESTIGAÇÃO: Calcular hash160 da chave derivada
    const derivedHash160 = ripemd160(sha256(publicKey));
    const derivedHash160Hex = Array.from(derivedHash160).map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('🔍 [HASH160 INVESTIGATION] Hash160 da chave derivada:', derivedHash160Hex);
    console.log('🔍 [HASH160 INVESTIGATION] Chave pública completa:', Array.from(publicKey).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // ✅ INVESTIGAÇÃO: Comparar com hash160 dos UTXOs
    utxos.forEach((utxo, index) => {
      if (utxo.script_pub_key && utxo.script_pub_key.length >= 44) {
        const utxoHash160 = utxo.script_pub_key.substring(4, 44);
        const match = utxoHash160 === derivedHash160Hex;
        console.log(`🔍 [HASH160 INVESTIGATION] UTXO ${index} hash160:`, utxoHash160);
        console.log(`🔍 [HASH160 INVESTIGATION] Chave derivada hash160:`, derivedHash160Hex);
        console.log(`🔍 [HASH160 INVESTIGATION] UTXO ${index} corresponde à chave?`, match);
        if (!match) {
          console.error(`❌ [HASH160 INVESTIGATION] ERRO: UTXO ${index} não corresponde à chave derivada!`);
          console.error(`❌ [HASH160 INVESTIGATION] UTXO hash160:`, utxoHash160);
          console.error(`❌ [HASH160 INVESTIGATION] Chave hash160:`, derivedHash160Hex);
          
          // ✅ TESTE: Tentar derivar chaves com diferentes paths
          console.log('🔍 [KEY DERIVATION TEST] Testando diferentes paths de derivação...');
          this.testKeyDerivation(utxoHash160);
        }
      }
    });

    const toScriptPubKey = this.buildOutputScriptFromAddress(toAddress);
    const changeScriptPubKey = this.buildOutputScriptFromAddress(fromAddress);

    // Escolher método de assinatura baseado no tipo de endereço de origem
    let rawSigned: string;
    const txParams = {
      inputs: selected,
      outputs: [
        { value: amount, scriptPubKey: toScriptPubKey },
        ...(change > 0 ? [{ value: change, scriptPubKey: changeScriptPubKey }] : [])
      ],
      privateKey,
      publicKey,
      fromAddress
    };

    switch (fromAddressInfo.type) {
      case 'p2pkh':
        console.log('🔧 [TX TYPE] Construindo transação Legacy P2PKH');
        rawSigned = await this.buildAndSignLegacyP2PKH(txParams);
        break;
      case 'p2sh':
        console.log('🔧 [TX TYPE] Construindo transação P2SH-P2WPKH');
        rawSigned = await this.buildAndSignP2SH_P2WPKH(txParams);
        break;
      case 'p2wpkh':
        console.log('🔧 [TX TYPE] Construindo transação P2WPKH');
        rawSigned = await this.buildAndSignP2WPKH(txParams);
        break;
      default:
        throw new Error(`Tipo de endereço não suportado: ${fromAddressInfo.type}`);
    }

    console.log('📦 [RAW TX]', rawSigned);
    console.log('🔍 [BROADCAST DEBUG] Enviando exatamente esse hex:', rawSigned);
    console.log('🔍 [BROADCAST DEBUG] Tamanho:', rawSigned.length / 2, 'bytes');
    console.log('🔍 [BROADCAST DEBUG] INFO: Tamanho pode variar devido a assinaturas DER (71-72 bytes)');
    console.log('🔍 [BROADCAST DEBUG] INFO: O que importa é o nó aceitar a transação');

    // 4) Broadcast via backend
    const broadcast = await bitcoinApiService.broadcastTransaction(rawSigned);
    console.log('✅ [BROADCAST] TXID:', broadcast.txid);
    return broadcast.txid;
  }

  async getTransactions(address: string): Promise<any[]> {
    try {
      console.log('🔍 [TRANSACTIONS] Buscando transações para:', address);
      const response = await bitcoinApiService.getTransactions(address);
      console.log('✅ [TRANSACTIONS] Transações obtidas:', response.transactions.length);
      
      // Converter para formato da UI - agora usando valores reais do backend
      return response.transactions.map(tx => {
        return {
          id: tx.txid,
          type: tx.value > 0 ? 'received' : 'sent',
          amount: Math.abs(tx.value),
          address: address,
          timestamp: new Date(tx.time).getTime(),
          confirmations: tx.confirmations,
          txid: tx.txid,
          blockHeight: tx.block_height,
          fee: tx.fee
        };
      });
    } catch (error) {
      console.error('❌ [TRANSACTIONS] Erro ao obter transações:', error);
      return [];
    }
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
