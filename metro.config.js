const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Adicionar suporte para polyfills
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: 'react-native-crypto',
  stream: 'readable-stream',
  buffer: 'buffer',
};

// Configurar extensões de arquivo
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;
