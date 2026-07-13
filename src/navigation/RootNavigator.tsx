import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View, Pressable } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useAppState } from '../state/AppState';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { addNotificationReceivedListener, addNotificationResponseReceivedListener } from '../services/pushNotifications';
import { useCoachmark, CoachStep } from '../onboarding/CoachmarkContext';
import CoachTabButton from '../onboarding/CoachTabButton';
import FlashLogo from '../components/FlashLogo';
import OfflineBanner from '../components/OfflineBanner';
import * as SplashScreen from 'expo-splash-screen';

import InviteGateScreen from '../screens/InviteGateScreen';
import UsernameScreen from '../screens/UsernameScreen';
import PhoneNumberScreen from '../screens/PhoneNumberScreen';
import SignInScreen from '../screens/SignInScreen';
import OTPScreen from '../screens/OTPScreen';
import FeedScreen from '../screens/FeedScreen';
import DuetFeedScreen from '../screens/DuetFeedScreen';
import CameraScreen from '../screens/CameraScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PhotoPreviewScreen from '../screens/PhotoPreviewScreen';
import PackRevealScreen from '../screens/PackRevealScreen';
import CommentMomentScreen from '../screens/CommentMomentScreen';
import InviteScreen from '../screens/InviteScreen';
import ReportScreen from '../screens/ReportScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AdminScreen from '../screens/AdminScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import StreakScreen from '../screens/StreakScreen';
import ProScreen from '../screens/ProScreen';
import PhotoViewerScreen from '../screens/PhotoViewerScreen';
import PackLifecycleScreen from '../screens/PackLifecycleScreen';
import LegalScreen from '../screens/LegalScreen';
import LegalMenuScreen from '../screens/LegalMenuScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import PrivacySettingsScreen from '../screens/PrivacySettingsScreen';
import AccessibilitySettingsScreen from '../screens/AccessibilitySettingsScreen';
import DataSecuritySettingsScreen from '../screens/DataSecuritySettingsScreen';
import ContactUsScreen from '../screens/ContactUsScreen';
import ReportBugScreen from '../screens/ReportBugScreen';
import PackVaultScreen from '../screens/PackVaultScreen';
import FamilyTreeScreen from '../screens/FamilyTreeScreen';
import CountriesScreen from '../screens/CountriesScreen';
import PackCalendarScreen from '../screens/PackCalendarScreen';
import WelcomeLocationScreen from '../screens/WelcomeLocationScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const makeNavTheme = (colors: Palette): Theme => {
  const base = colors.name === 'light' ? DefaultTheme : DarkTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: colors.black,
      card: colors.black,
      border: 'transparent',
      primary: colors.yellow,
      text: colors.white,
    },
  };
};

const COACH_STEPS: CoachStep[] = [
  {
    id: 'tab-feed',
    title: 'your feed',
    text: "this is where your packs land. tap a pack to relive the moment with your crew.",
  },
  {
    id: 'tab-camera',
    title: 'capture a pack',
    text: 'tap here to snap your daily moment. everyone in your pack posts, then it all unlocks.',
  },
  {
    id: 'tab-profile',
    title: 'your profile',
    text: 'track your streak, invites, and the countries your packs have reached.',
  },
];

function Tabs() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { startOnboardingOnce } = useCoachmark();

  useEffect(() => {
    // Give the tab bar a moment to lay out before measuring targets.
    const t = setTimeout(() => {
      startOnboardingOnce(COACH_STEPS);
    }, 900);
    return () => clearTimeout(t);
  }, [startOnboardingOnce]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.yellow,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size, focused }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Feed: focused ? 'grid' : 'grid-outline',
            Camera: focused ? 'camera' : 'camera-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          const name = map[route.name] ?? 'help-circle';
          return <Ionicons name={name} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{ tabBarButton: (props) => <CoachTabButton coachId="tab-feed" {...props} /> }}
      />
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{ tabBarButton: (props) => <CoachTabButton coachId="tab-camera" {...props} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarButton: (props) => <CoachTabButton coachId="tab-profile" {...props} /> }}
      />
    </Tab.Navigator>
  );
}

function CustomSplash() {
  const styles = useThemedStyles(makeStyles);
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return (
    <View style={styles.boot}>
      <FlashLogo size={42} />
    </View>
  );
}

export default function RootNavigator() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const navTheme = makeNavTheme(colors);
  const { isAuthenticated, isBooting, isOnboarding, isConnected, setIsConnected, refreshPacks, refreshDiscover } = useAppState();
  const wasConnected = useRef<boolean | null>(null);

  // Subscribe to connectivity changes
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true;
      setIsConnected(connected);

      // Re-fetch when coming back online after being offline
      if (wasConnected.current === false && connected) {
        refreshPacks().catch(() => {});
        refreshDiscover?.().catch(() => {});
      }
      wasConnected.current = connected;
    });
    return unsub;
  }, [setIsConnected, refreshPacks, refreshDiscover]);

  useEffect(() => {
    const received = addNotificationReceivedListener((notification) => {
      console.log('push received in foreground', notification.request.content);
    });
    const response = addNotificationResponseReceivedListener((response) => {
      const packId = response.notification.request.content.data?.packId as string | undefined;
      if (packId) {
        // navigation will be handled when app is ready
      }
    });
    return () => {
      received.remove();
      response.remove();
    };
  }, []);

  if (isBooting) {
    return <CustomSplash />;
  }

  return (
    <View style={styles.root}>
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.black },
          }}
        >
          {!isAuthenticated ? (
            <>
              <Stack.Screen name="InviteGate" component={InviteGateScreen} />
              <Stack.Screen name="OTPScreen" component={OTPScreen} />
              <Stack.Screen name="Username" component={UsernameScreen} />
              <Stack.Screen name="PhoneNumberScreen" component={PhoneNumberScreen} />
              <Stack.Screen name="SignIn" component={SignInScreen} />
            </>
          ) : isOnboarding ? (
            <>
              <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
              <Stack.Screen name="OnboardingPro" component={ProScreen} options={{ animation: 'slide_from_bottom' }} />
            </>
          ) : (
            <>
              <Stack.Screen name="Tabs" component={Tabs} />
              <Stack.Screen name="DuetFeed" component={DuetFeedScreen} />
              <Stack.Screen name="PhotoPreview" component={PhotoPreviewScreen} />
              <Stack.Screen name="PackReveal" component={PackRevealScreen} />
              <Stack.Screen name="PhotoViewer" component={PhotoViewerScreen} options={{ presentation: 'modal', animation: 'fade' }} />
              <Stack.Screen name="PackLifecycle" component={PackLifecycleScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="Comment" component={CommentMomentScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Streak" component={StreakScreen} />
              <Stack.Screen name="Pro" component={ProScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="Invite" component={InviteScreen} />
              <Stack.Screen name="FamilyTree" component={FamilyTreeScreen} />
              <Stack.Screen name="Admin" component={AdminScreen} />
              <Stack.Screen name="Report" component={ReportScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="LegalMenu" component={LegalMenuScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="Legal" component={LegalScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="AccessibilitySettings" component={AccessibilitySettingsScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="DataSecuritySettings" component={DataSecuritySettingsScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="ContactUs" component={ContactUsScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="ReportBug" component={ReportBugScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="PackVault" component={PackVaultScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="Countries" component={CountriesScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="PackCalendar" component={PackCalendarScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="PublicProfile" component={ProfileScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <OfflineBanner visible={!isConnected} />
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  root: { flex: 1 },
  boot: { flex: 1, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    backgroundColor: colors.black,
    borderTopColor: colors.borderSoft,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 64,
    paddingTop: 8,
    paddingBottom: 8,
  },
});
