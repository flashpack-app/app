import PostHog from 'posthog-react-native';

export const posthog = new PostHog('phc_nJNxED8AMbfjiZKhCRdidgPJ7ABHtiWiFbHQzsfFfYXb', {
  host: 'https://eu.i.posthog.com',
  // Disable in local dev so we don't pollute analytics with test data
  disabled: __DEV__,
  // Flush quickly during development validation
  flushAt: __DEV__ ? 1 : 20,
  flushInterval: 10000,
  captureAppLifecycleEvents: true,
});
