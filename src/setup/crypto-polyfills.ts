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

console.log('✅ Polyfills de criptografia carregados com sucesso');
