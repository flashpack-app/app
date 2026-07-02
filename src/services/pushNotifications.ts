import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { APIService } from './api';

// EAS project id is required to mint an Expo push token. It only exists once the
// app is linked to an EAS project (app.json `extra.eas.projectId`). In bare dev /
// Expo Go without a project, we skip push registration instead of throwing.
function getProjectId(): string | undefined {
  return (
    (Constants.expoConfig as any)?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId ??
    undefined
  );
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(token: string): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('push notification permission not granted');
    return null;
  }

  try {
    const projectId = getProjectId();
    if (!projectId) {
      console.warn('push notifications skipped: no EAS projectId configured');
      return null;
    }
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!pushToken) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    await APIService.savePushToken(token, pushToken);
    return pushToken;
  } catch (e) {
    console.error('push token registration failed', e);
    return null;
  }
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// Returns the notification tap that launched the app (cold start), if any.
export function getLastNotificationResponseAsync() {
  return Notifications.getLastNotificationResponseAsync();
}

export function extractPackId(response: Notifications.NotificationResponse | null): string | null {
  const packId = response?.notification.request.content.data?.packId;
  return typeof packId === 'string' && packId.length > 0 ? packId : null;
}
