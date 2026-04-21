const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 1. Añadir soporte para extensiones .cjs necesarias en Firebase SDK v10
config.resolver.sourceExts.push('cjs');

// 2. Deshabilitar los package exports experimentales que causan 
// "Component auth has not been registered yet" al usar Firebase v10 con Expo Metro
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
