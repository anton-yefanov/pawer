import * as Sentry from '@sentry/react-native';
import '@/i18n';

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay, SplashReady } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { Onboarding } from '@/components/onboarding/onboarding';
import { TelemetrySync } from '@/components/telemetry-sync';
import { DatabaseProvider } from '@/db/provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { AppResetProvider } from '@/lib/app-reset';
import { AutofillWeightProvider } from '@/lib/autofill-weight';
import { BodySexProvider } from '@/lib/body-sex';
import { FinishReminderProvider } from '@/lib/finish-reminder';
import { HomeWidgetProvider } from '@/lib/home-widget';
import { KeyboardProvider } from '@/lib/keyboard-provider';
import { LibraryLayoutProvider } from '@/lib/library-layout';
import { WorkoutActivityProvider } from '@/lib/live-activity';
import { NoticeHost } from '@/lib/notice';
import { initObservability } from '@/lib/observability';
import { OnboardingProvider } from '@/lib/onboarding';
import { PurchasesProvider } from '@/lib/purchases';
import { RestTimerProvider } from '@/lib/rest-timer';
import { PromptHost } from '@/lib/text-prompt';
import { ThemePreferenceProvider } from '@/lib/theme-preference';
import { WarmupStatsProvider } from '@/lib/warmup-stats';
import { WeightUnitProvider } from '@/lib/weight-unit';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Documented to reject; the splash hiding a frame early is not worth a crash.
});

initObservability();

export { AppErrorBoundary as ErrorBoundary } from '@/components/app-error-boundary';

function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <DatabaseProvider>
          <PurchasesProvider>
            <AppResetProvider>
              <ThemePreferenceProvider>
                <WeightUnitProvider>
                  <BodySexProvider>
                    <OnboardingProvider>
                      <AutofillWeightProvider>
                        <WarmupStatsProvider>
                          <FinishReminderProvider>
                            <LibraryLayoutProvider>
                              <HomeWidgetProvider>
                                <ThemedApp />
                              </HomeWidgetProvider>
                            </LibraryLayoutProvider>
                          </FinishReminderProvider>
                        </WarmupStatsProvider>
                      </AutofillWeightProvider>
                    </OnboardingProvider>
                  </BodySexProvider>
                </WeightUnitProvider>
              </ThemePreferenceProvider>
            </AppResetProvider>
          </PurchasesProvider>
        </DatabaseProvider>
      </KeyboardProvider>
      <AnimatedSplashOverlay />
    </GestureHandlerRootView>
  );
}

/** Separate component so the navigation theme can read the stored preference. */
function ThemedApp() {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, primary: theme.accent } }}>
      <RestTimerProvider>
        <WorkoutActivityProvider>
          <SplashReady />
          <AppTabs />
          <Onboarding />
          <PromptHost />
          <NoticeHost />
          <TelemetrySync />
        </WorkoutActivityProvider>
      </RestTimerProvider>
    </ThemeProvider>
  );
}

export default Sentry.wrap(TabLayout);
