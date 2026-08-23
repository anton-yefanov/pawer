import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { DatabaseProvider } from '@/db/provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AutofillWeightProvider } from '@/lib/autofill-weight';
import { FinishReminderProvider } from '@/lib/finish-reminder';
import { KeyboardProvider } from '@/lib/keyboard-provider';
import { WorkoutActivityProvider } from '@/lib/live-activity';
import { NoticeHost } from '@/lib/notice';
import { PurchasesProvider } from '@/lib/purchases';
import { RestTimerProvider } from '@/lib/rest-timer';
import { PromptHost } from '@/lib/text-prompt';
import { ThemePreferenceProvider } from '@/lib/theme-preference';
import { WeightUnitProvider } from '@/lib/weight-unit';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <DatabaseProvider>
          <PurchasesProvider>
            <ThemePreferenceProvider>
              <WeightUnitProvider>
                <AutofillWeightProvider>
                  <FinishReminderProvider>
                    <ThemedApp />
                  </FinishReminderProvider>
                </AutofillWeightProvider>
              </WeightUnitProvider>
            </ThemePreferenceProvider>
          </PurchasesProvider>
        </DatabaseProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

/** Separate component so the navigation theme can read the stored preference. */
function ThemedApp() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RestTimerProvider>
        <WorkoutActivityProvider>
          <AnimatedSplashOverlay />
          <AppTabs />
          <PromptHost />
          <NoticeHost />
        </WorkoutActivityProvider>
      </RestTimerProvider>
    </ThemeProvider>
  );
}
