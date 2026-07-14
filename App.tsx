import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PostHogProvider } from 'posthog-react-native';
import { AppStateProvider } from './src/state/AppState';
import { AccessibilityProvider } from './src/services/AccessibilityContext';
import { CoachmarkProvider } from './src/onboarding/CoachmarkContext';
import RootNavigator from './src/navigation/RootNavigator';
import { useColors } from './src/theme/useColors';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import { posthog } from './src/config/posthog';

Sentry.init({
  dsn: 'https://aa30fd978c159fcaf6f835c8be6fdb4d@o4511730755174400.ingest.de.sentry.io/4511730759434320',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const colors = useColors();
  return <StatusBar style={colors.name === 'light' ? 'dark' : 'light'} />;
}

export default Sentry.wrap(function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <SafeAreaProvider>
        <PostHogProvider
          client={posthog}
          debug={__DEV__}
          autocapture={{
            captureScreens: false,
            captureTouches: true,
            propsToCapture: ['testID'],
          }}
        >
          <AppStateProvider>
            <AccessibilityProvider>
              <CoachmarkProvider>
                <ThemedStatusBar />
                <RootNavigator />
              </CoachmarkProvider>
            </AccessibilityProvider>
          </AppStateProvider>
        </PostHogProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
});
