const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Necesario para que Firebase v10 resuelva el build correcto para React Native.
// Sin esto, Metro ignora el campo "exports" del package.json de Firebase
// e importa la build de browser, causando "Component auth has not been registered yet".
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
