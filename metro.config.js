const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// LifeOS targets Android/iOS only — skip web to avoid SSR crashes killing Metro.
config.resolver.platforms = ['ios', 'android', 'native'];

module.exports = config;
