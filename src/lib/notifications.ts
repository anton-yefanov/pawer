import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ANDROID_CHANNEL_ID = 'rest-timer';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: false,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

if (Platform.OS === 'android') {
  void Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Rest timer',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });
}

/**
 * Asked on the first rest timer, never at launch — a permission prompt before
 * the user has seen the app work is the one most reliably denied. Denial is not
 * fatal: the in-app countdown still runs off the stored end timestamp, only the
 * background ping is lost.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const next = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return next.granted;
}

/**
 * Scheduled against an absolute date, not an interval. iOS suspends JS within
 * seconds of backgrounding, so the notification is the only thing that can fire
 * on time (IMPLEMENTATION_PLAN §3.1).
 */
export async function scheduleRestNotification(
  endsAt: number,
  body: string
): Promise<string | null> {
  if (!(await ensureNotificationPermission())) return null;

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest over',
        body,
        sound: 'default',
        interruptionLevel: 'timeSensitive',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(endsAt),
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  } catch (error) {
    console.warn('[notifications] failed to schedule rest notification', error);
    return null;
  }
}

export async function cancelScheduledNotification(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (error) {
    console.warn('[notifications] failed to cancel notification', error);
  }
}
