const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle migrations ship as .sql files that Metro has to treat as source.
config.resolver.sourceExts.push('sql');

module.exports = config;
