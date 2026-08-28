const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Drizzle migrations ship as .sql files that Metro has to treat as source.
config.resolver.sourceExts.push('sql');

module.exports = config;