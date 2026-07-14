import PostHog from 'posthog-react-native';

export const posthog = new PostHog('phc_nJNxED8AMbfjiZKhCRdidgPJ7ABHtiWiFbHQzsfFfYXb', {
  host: 'https://eu.i.posthog.com',
  // TODO: revert to `disabled: __DEV__` after testing
  disabled: false,
  // Flush every event immediately so you see them in PostHog in real time
  flushAt: 1,
  flushInterval: 1000,
  captureAppLifecycleEvents: true,
});

