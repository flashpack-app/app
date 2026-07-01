import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from './src/state/AppState';
import { AccessibilityProvider } from './src/services/AccessibilityContext';
import { CoachmarkProvider } from './src/onboarding/CoachmarkContext';
import RootNavigator from './src/navigation/RootNavigator';
import { useColors } from './src/theme/useColors';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const colors = useColors();
  return <StatusBar style={colors.name === 'light' ? 'dark' : 'light'} />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <SafeAreaProvider>
        <AppStateProvider>
          <AccessibilityProvider>
            <CoachmarkProvider>
              <ThemedStatusBar />
              <RootNavigator />
            </CoachmarkProvider>
          </AccessibilityProvider>
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
