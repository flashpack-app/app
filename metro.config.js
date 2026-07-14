const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

config.resolver.assetExts.push('lottie');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;