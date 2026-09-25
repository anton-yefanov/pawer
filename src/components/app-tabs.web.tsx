import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet } from 'react-native';

import { ExternalLink } from './external-link';
import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { t } from '@/i18n';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="history" href="/history" asChild>
            <TabButton>{t('common:tab.history')}</TabButton>
          </TabTrigger>
          <TabTrigger name="exercises" href="/exercises" asChild>
            <TabButton>{t('common:tab.exercises')}</TabButton>
          </TabTrigger>
          <TabTrigger name="workout" href="/" asChild>
            <TabButton>{t('common:tab.workout')}</TabButton>
          </TabTrigger>
          <TabTrigger name="analytics" href="/analytics" asChild>
            <TabButton>{t('common:tab.analytics')}</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton>{t('common:tab.settings')}</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'surface'}
        style={styles.tabButtonView}>
        <ThemedText type="caption2" weight="medium" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const colors = Colors[useColorScheme()];

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="surface" style={styles.innerContainer}>
        <ThemedText type="footnote" weight="semibold" style={styles.brandText}>
          {t('common:webBrand')}
        </ThemedText>

        {props.children}

        <ExternalLink href="https://docs.expo.dev" asChild>
          <Pressable style={styles.externalPressable}>
            <ThemedText themeColor="accent">{t('common:webDocs')}</ThemedText>
            <Icon
              tintColor={colors.text}
              name="arrow.up.right.square"
              size={12}
            />
          </Pressable>
        </ExternalLink>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  externalPressable: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginLeft: Spacing.three,
  },
});

/** Only Android draws its tab bar inside a screen; see `app-tabs.android.tsx`. */
export const tabBarScreenLayout = undefined;
