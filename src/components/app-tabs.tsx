import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { tabIcon } from './icon';

export default function AppTabs() {
  return (
    <NativeTabs labelVisibilityMode="unlabeled">
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label hidden>History</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon {...tabIcon('clock', 'clock.fill')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="exercises">
        <NativeTabs.Trigger.Label hidden>Exercises</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon {...tabIcon('dumbbell', 'dumbbell.fill')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(workout)">
        <NativeTabs.Trigger.Label hidden>Workout</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon {...tabIcon('house', 'house.fill')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="analytics">
        <NativeTabs.Trigger.Label hidden>Analytics</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon {...tabIcon('chart.bar', 'chart.bar.fill')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label hidden>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon {...tabIcon('gearshape', 'gearshape.fill')} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/** Only Android draws its tab bar inside a screen; see `app-tabs.android.tsx`. */
export const tabBarScreenLayout = undefined;
