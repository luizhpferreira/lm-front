// Teste da correção do Base58
const { generateMnemonic, mnemonicToSeedSync } = require("@scure/bip39");
const { wordlist } = require("@scure/bip39/wordlists/english");
const { HDKey } = require("@scure/bip32");
const { ripemd160 } = require("@noble/hashes/legacy");
const { sha256 } = require("@noble/hashes/sha2");

console.log('🔍 Testando correção do Base58...');

// Gerar mnemonic
const mnemonic = generateMnemonic(wordlist, 128);
console.log('✅ Mnemonic gerado:', mnemonic);

// Gerar seed
const seed = mnemonicToSeedSync(mnemonic);
const root = HDKey.fromMasterSeed(seed);
const child = root.derive("m/44'/0'/0'/0/0");
const publicKey = child.publicKey;

// Gerar hash160 real
const sha256Hash = sha256(publicKey);
const hash160 = ripemd160(sha256Hash);

// Função Base58 corrigida
function base58Encode(bytes) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  
  // Converter bytes para BigInt diretamente
  let num = 0n;
  for (let i = 0; i < bytes.length; i++) {
    num = num * 256n + BigInt(bytes[i]);
  }
  
  let result = "";
  while (num > 0n) {
    result = alphabet[Number(num % 58n)] + result;
    num = num / 58n;
  }
  
  // Adicionar '1's para zeros à esquerda
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    result = "1" + result;
  }
  
  return result;
}

// Gerar endereço P2PKH
const version = new Uint8Array([0x00]);
const payload = new Uint8Array([...version, ...hash160]);
const checksum = sha256(sha256(payload)).slice(0, 4);
const addressBytes = new Uint8Array([...payload, ...checksum]);
const p2pkhAddress = base58Encode(addressBytes);

console.log('🎯 Endereço P2PKH gerado:', p2pkhAddress);
console.log('📏 Comprimento:', p2pkhAddress.length);

// Verificar se contém caracteres hexadecimais
const hasHexChars = /[0-9a-f]/.test(p2pkhAddress);
console.log('🔢 Contém caracteres hexadecimais:', hasHexChars);

// Verificar se é Base58 válido
const isBase58 = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(p2pkhAddress);
console.log('✅ É Base58 válido:', isBase58);

if (isBase58 && !hasHexChars) {
  console.log('🎉 ENDEREÇO BITCOIN VÁLIDO GERADO!');
  console.log('💰 Pronto para receber BTC real!');
} else {
  console.log('❌ Ainda há problemas na geração');
}
