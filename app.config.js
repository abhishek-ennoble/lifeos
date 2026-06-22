const base = require('./app.json').expo;

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  ...base,
  plugins: ['expo-dev-client', ...base.plugins],
  extra: {
    ...base.extra,
    eas: {
      ...base.extra?.eas,
      projectId: '8afa153c-3aad-41ee-8f61-c96fc2517ee5',
    },
  },
};
