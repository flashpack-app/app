const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");
const path = require("path");

const config = getSentryExpoConfig(__dirname);

config.resolver.assetExts.push('lottie');
// Metro (Expo SDK 54) can't handle `exports` maps in some packages;
// disable them and manually remap any subpath imports that break.
config.resolver.unstable_enablePackageExports = false;

// Manually resolve @posthog/core subpath exports that Metro can't find
// when unstable_enablePackageExports is false.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const posthogSubpaths = {
    '@posthog/core/surveys': path.resolve(__dirname, 'node_modules/@posthog/core/dist/surveys/index.js'),
    '@posthog/core/utils':   path.resolve(__dirname, 'node_modules/@posthog/core/dist/utils/index.js'),
  };
  if (posthogSubpaths[moduleName]) {
    return { filePath: posthogSubpaths[moduleName], type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;