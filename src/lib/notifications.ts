import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REST_CHANNEL_ID = 'rest-timer';

/**
 * One fixed identifier for every rest ping, so a new one replaces the pending
 * *and* the already-delivered banner instead of piling a second "Rest over" on
 * the lock screen for a set the user has long since finished.
 */
const REST_NOTIFICATION_ID = 'rest-timer';

export const REMINDER_CHANNEL_ID = 'workout-reminders';

export const FINISH_REMINDER_DATA_TYPE = 'finish-reminder';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // The finish reminder is cancelled whenever the app comes forward, so a
    // foreground delivery only happens in the resume race — and a "still
    // working out?" banner over the open workout would be nonsense.
    const silent = notification.request.content.data?.type === FINISH_REMINDER_DATA_TYPE;
    return {
      shouldShowBanner: !silent,
      shouldShowList: false,
      shouldPlaySound: !silent,
      shouldSetBadge: false,
    };
  },
});

if (Platform.OS === 'android') {
  void Notifications.setNotificationChannelAsync(REST_CHANNEL_ID, {
    name: 'Rest timer',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });
  void Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Workout reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
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
export async function scheduleNotification(input: {
  title: string;
  body: string;
  date: number;
  channelId: string;
  interruptionLevel: 'active' | 'timeSensitive';
  data?: Record<string, unknown>;
  identifier?: string;
}): Promise<string | null> {
  if (!(await ensureNotificationPermission())) return null;

  try {
    return await Notifications.scheduleNotificationAsync({
      identifier: input.identifier,
      content: {
        title: input.title,
        body: input.body,
        sound: 'default',
        interruptionLevel: input.interruptionLevel,
        data: input.data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(input.date),
        channelId: input.channelId,
      },
    });
  } catch (error) {
    console.warn('[notifications] failed to schedule notification', error);
    return null;
  }
}

export async function scheduleRestNotification(
  endsAt: number,
  body: string
): Promise<string | null> {
  await dismissRestNotification();
  return scheduleNotification({
    title: 'Rest over',
    body,
    date: endsAt,
    channelId: REST_CHANNEL_ID,
    interruptionLevel: 'timeSensitive',
    identifier: REST_NOTIFICATION_ID,
  });
}

export async function cancelRestNotification(id: string | null): Promise<void> {
  await cancelScheduledNotification(id ?? REST_NOTIFICATION_ID);
  await dismissRestNotification();
}

async function dismissRestNotification(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.dismissNotificationAsync(REST_NOTIFICATION_ID);
  } catch {
    // Nothing delivered under that id; there is nothing to clear.
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

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/** The tap that cold-started the app, which the listener above is too late for. */
export function getLastNotificationResponse() {
  return Notifications.getLastNotificationResponseAsync();
}

export function readFinishReminderWorkoutId(
  response: Notifications.NotificationResponse | null
): string | null {
  const data = response?.notification.request.content.data;
  if (data?.type !== FINISH_REMINDER_DATA_TYPE) return null;
  return typeof data.workoutId === 'string' ? data.workoutId : null;
}
