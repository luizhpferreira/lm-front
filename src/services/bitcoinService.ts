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
    
    // Gerar endereço Bitcoin (padrão: Bech32 para novos usuários)
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

  // Converte número para varint (variable length integer)
  private toVarInt(n: number): Uint8Array {
    if (n < 0xfd) return new Uint8Array([n]);
    if (n <= 0xffff) return new Uint8Array([0xfd, n & 0xff, (n >> 8) & 0xff]);
    if (n <= 0xffffffff) return new Uint8Array([0xfe, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
    const b = new Uint8Array(9);
    b[0] = 0xff;
    let x = BigInt(n);
    for (let i = 0; i < 8; i++) { b[1 + i] = Number((x >> BigInt(8 * i)) & BigInt(0xff)); }
    return b;
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
    const prevouts = concat(...inputs.map(inp => concat(reverse32(inp.txid), u32LE(inp.vout))));
    parts.push(sha256(prevouts));
    
    // 3. HashSequence (32 bytes) - SHA256 of all input sequence numbers (0xffffffff for SIGHASH_ALL)
    const sequences = new Uint8Array(inputs.length * 4);
    for (let i = 0; i < inputs.length; i++) {
      sequences.set(u32LE(0xffffffff), i * 4);
    }
    parts.push(sha256(sequences));
    
    // 4. Outpoint (36 bytes) - txid + vout of current input
    const currentInput = inputs[inputIndex];
    parts.push(concat(reverse32(currentInput.txid), u32LE(currentInput.vout)));
    
    // 5. ScriptCode (varint + script)
    const scriptCodeLen = this.toVarInt(scriptCode.length);
    parts.push(concat(scriptCodeLen, scriptCode));
    
    // 6. Value (8 bytes) - value of current input
    parts.push(u64LE(currentInput.value));
    
    // 7. Sequence (4 bytes) - sequence number of current input
    parts.push(u32LE(0xffffffff));
    
    // 8. HashOutputs (32 bytes) - SHA256 of all outputs
    const outputsData = concat(...outputs.map(out => concat(u64LE(out.value), this.toVarInt(out.scriptPubKey.length), out.scriptPubKey)));
    parts.push(sha256(outputsData));
    
    // 9. LockTime (4 bytes)
    parts.push(u32LE(0));
    
    // 10. SighashType (4 bytes)
    parts.push(u32LE(hashType));
    
    return concat(...parts);
  }

  // Constrói e assina transação SegWit P2WPKH (bc1...)
  private async buildAndSignP2WPKH(params: {
    inputs: { txid: string; vout: number; value: number }[];
    outputs: { value: number; scriptPubKey: Uint8Array }[];
    privateKey: Uint8Array;
    publicKey: Uint8Array;
  }): Promise<string> {
    const { inputs, outputs, privateKey, publicKey } = params;
    
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

    // ScriptCode para P2WPKH: OP_DUP OP_HASH160 0x14 <20-byte> OP_EQUALVERIFY OP_CHECKSIG
    const hash160 = ripemd160(sha256(publicKey));
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
      
      const digest = sha256(sha256(preimage));
      
      // Assinar
      const sigAny: any = secp.sign(digest, privateKey, { lowS: true });
      let der: Uint8Array;
      if (sigAny instanceof Uint8Array) {
        der = this.compactToDER(sigAny);
      } else if (sigAny && typeof sigAny.toDERRaw === 'function') {
        der = sigAny.toDERRaw();
      } else if (sigAny && typeof sigAny.toDERHex === 'function') {
        der = hexToBytes(sigAny.toDERHex());
      } else {
        throw new Error('Formato de assinatura não suportado');
      }
      
      const sigWithHashType = new Uint8Array(der.length + 1);
      sigWithHashType.set(der);
      sigWithHashType[der.length] = 0x01; // SIGHASH_ALL
      
      // Witness para P2WPKH: [signature, publicKey]
      witnesses.push([sigWithHashType, publicKey]);
    }

    // Construir transação final
    const parts: Uint8Array[] = [];
    
    // Version
    parts.push(u32LE(1));
    
    // Marker e Flag para SegWit
    parts.push(new Uint8Array([0x00])); // marker
    parts.push(new Uint8Array([0x01])); // flag
    
    // Input count
    parts.push(this.toVarInt(inputs.length));
    
    // Inputs (sem scriptSig para SegWit)
    for (const inp of inputs) {
      parts.push(reverse32(inp.txid));
      parts.push(u32LE(inp.vout));
      parts.push(this.toVarInt(0)); // scriptSig vazio
      parts.push(u32LE(0xffffffff));
    }
    
    // Output count
    parts.push(this.toVarInt(outputs.length));
    
    // Outputs
    for (const out of outputs) {
      parts.push(u64LE(out.value));
      parts.push(this.toVarInt(out.scriptPubKey.length));
      parts.push(out.scriptPubKey);
    }
    
    // Witness data
    for (const witness of witnesses) {
      parts.push(this.toVarInt(witness.length));
      for (const item of witness) {
        parts.push(this.toVarInt(item.length));
        parts.push(item);
      }
    }
    
    // LockTime
    parts.push(u32LE(0));
    
    const raw = concat(...parts);
    const hex = Array.from(raw).map((b) => b.toString(16).padStart(2, '0')).join('');
    return hex;
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
      
      const digest = sha256(sha256(preimage));
      
      // Assinar
      const sigAny: any = secp.sign(digest, privateKey, { lowS: true });
      let der: Uint8Array;
      if (sigAny instanceof Uint8Array) {
        der = this.compactToDER(sigAny);
      } else if (sigAny && typeof sigAny.toDERRaw === 'function') {
        der = sigAny.toDERRaw();
      } else if (sigAny && typeof sigAny.toDERHex === 'function') {
        der = hexToBytes(sigAny.toDERHex());
    } else {
        throw new Error('Formato de assinatura não suportado');
      }
      
      const sigWithHashType = new Uint8Array(der.length + 1);
      sigWithHashType.set(der);
      sigWithHashType[der.length] = 0x01; // SIGHASH_ALL
      
      // Witness para P2SH-P2WPKH: [signature, publicKey]
      witnesses.push([sigWithHashType, publicKey]);
    }

    // Construir transação final
    const parts: Uint8Array[] = [];
    
    // Version
    parts.push(u32LE(1));
    
    // Marker e Flag para SegWit
    parts.push(new Uint8Array([0x00])); // marker
    parts.push(new Uint8Array([0x01])); // flag
    
    // Input count
    parts.push(this.toVarInt(inputs.length));
    
    // Inputs (com redeemScript no scriptSig)
    for (const inp of inputs) {
      parts.push(reverse32(inp.txid));
      parts.push(u32LE(inp.vout));
      parts.push(this.toVarInt(redeemScript.length));
      parts.push(redeemScript);
      parts.push(u32LE(0xffffffff));
    }
    
    // Output count
    parts.push(this.toVarInt(outputs.length));
    
    // Outputs
    for (const out of outputs) {
      parts.push(u64LE(out.value));
      parts.push(this.toVarInt(out.scriptPubKey.length));
      parts.push(out.scriptPubKey);
    }
    
    // Witness data
    for (const witness of witnesses) {
      parts.push(this.toVarInt(witness.length));
      for (const item of witness) {
        parts.push(this.toVarInt(item.length));
        parts.push(item);
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
      selected.push({ txid: u.txid, vout: u.vout, value: u.value });
      totalIn += u.value;
      const inputVBytes = INPUT_VBYTES[fromAddressInfo.type];
      const estVBytes = OVERHEAD_VBYTES + selected.length * inputVBytes + numOutputs * OUTPUT_VBYTES;
      const estFee = feeRate * estVBytes;
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
      publicKey
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

    // 4) Broadcast via backend
    const broadcast = await bitcoinApiService.broadcastTransaction(rawSigned);
    console.log('✅ [BROADCAST] TXID:', broadcast.txid);
    return broadcast.txid;
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
