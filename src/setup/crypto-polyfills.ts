// Polyfills para criptografia no React Native
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import 'react-native-crypto';

// Configurar globals necessários para bibliotecas de criptografia
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

// Configurar crypto global se necessário
if (typeof global.crypto === 'undefined') {
  // @ts-ignore
  global.crypto = require('react-native-crypto');
}

// Configurar process se necessário
if (typeof global.process === 'undefined') {
  global.process = require('process');
}

// Configurar TextEncoder/TextDecoder se necessário
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('text-encoding').TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('text-encoding').TextDecoder;
}

// Configurar Math.random para bip39 se necessário
if (typeof Math.random === 'undefined' || !Math.random) {
  console.warn('⚠️ Math.random não está disponível, configurando fallback');
  Math.random = () => {
    const crypto = global.crypto || require('react-native-crypto');
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
  };
}

console.log('✅ Polyfills de criptografia carregados com sucesso');
