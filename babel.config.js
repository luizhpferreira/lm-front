module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'babel-plugin-module-resolver',
        {
          alias: {
            crypto: 'react-native-crypto',
            stream: 'readable-stream',
            buffer: 'buffer',
          },
        },
      ],
    ],
  };
};
