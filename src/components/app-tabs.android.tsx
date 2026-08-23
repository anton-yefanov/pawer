import {
  defaultTabsSlotRender,
  Tabs,
  TabList,
  TabSlot,
  TabTrigger,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloatingSurface } from './floating-surface';
import { Icon, type IconName } from './icon';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Android's `NativeTabs` is a Material bottom navigation bar glued to the
 * screen's edge, which is the one piece of chrome that does not float over the
 * grey page like everything else here. The headless `expo-router/ui` navigator
 * gives the same five tabs with a bar we draw ourselves — the arrangement
 * `app-tabs.web.tsx` already uses. iOS keeps `app-tabs.tsx`.
 *
 * `TabList` only *declares* the tabs: `Tabs` reads the triggers out of this
 * element tree to build its routes, so the list itself never has to be seen.
 * The bar the user touches is `tabBarScreenLayout` below, where a `TabTrigger`
 * needs nothing but the name declared here.
 *
 * Every tab is mounted at startup and stays mounted. `TabSlot` renders `null`
 * for a tab that has never been focused and hands `react-native-screens` an
 * activity state that detaches the ones that have — so a first visit to a tab
 * is a whole screen mounting and laying out in the frame it appears, which
 * reads as a blink. `loaded: true` opts every tab out of that, and
 * `detachInactiveScreens` keeps the native views around afterwards; an
 * unfocused tab is just `display: 'none'`. The cost is that all five tabs' live
 * queries run at launch instead of on first visit.
 */
export default function AppTabs() {
  return (
    <Tabs style={styles.tabs} options={{ backBehavior: 'history' }}>
      <TabSlot
        style={styles.slot}
        detachInactiveScreens={false}
        renderFn={(descriptor, options) =>
          defaultTabsSlotRender(descriptor, { ...options, loaded: true })
        }
      />
      <TabList style={styles.declaration}>
        <TabTrigger name="history" href="/history" />
        <TabTrigger name="exercises" href="/exercises" />
        <TabTrigger name="workout" href="/" />
        <TabTrigger name="analytics" href="/analytics" />
        <TabTrigger name="settings" href="/settings" />
      </TabList>
    </Tabs>
  );
}

/**
 * Spread onto every tab stack's `Stack` so the bar renders *inside* the tab's
 * root screen.
 *
 * Layering is the whole point. A `formSheet` is a Material bottom sheet in the
 * activity's own window here, not a Dialog, so a bar mounted as a sibling of
 * `TabSlot` paints over every sheet — and hiding it on the route instead means
 * waiting for `BottomSheetBehavior` to finish dismissing before the route pops,
 * which is a visible lag before the bar comes back. One screen down, the sheet
 * is a stack entry above the bar and covers it for free, with no state to
 * animate and nothing to time.
 *
 * Only the root screen is wrapped. Every other screen is a sheet, and a sheet
 * measuring itself with `fitToContents` gets its height from the content — an
 * extra `flex: 1` around it would report the whole screen.
 */
export function tabBarScreenLayout({
  route,
  children,
}: {
  route: { name: string };
  children: ReactElement;
}) {
  if (route.name !== 'index') return children;

  return (
    <View style={styles.screen}>
      {children}
      <FloatingTabBar />
    </View>
  );
}

function FloatingTabBar() {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.bar, { bottom: insets.bottom + Spacing.two }]}>
      <FloatingSurface style={styles.pill}>
        <TabTrigger name="history" asChild>
          <TabItem icon="clock" selectedIcon="clock.fill" />
        </TabTrigger>
        <TabTrigger name="exercises" asChild>
          <TabItem icon="dumbbell" selectedIcon="dumbbell.fill" />
        </TabTrigger>
        <TabTrigger name="workout" asChild>
          <TabItem icon="house" selectedIcon="house.fill" />
        </TabTrigger>
        <TabTrigger name="analytics" asChild>
          <TabItem icon="chart.bar" selectedIcon="chart.bar.fill" />
        </TabTrigger>
        <TabTrigger name="settings" asChild>
          <TabItem icon="gearshape" selectedIcon="gearshape.fill" />
        </TabTrigger>
      </FloatingSurface>
    </View>
  );
}

type TabItemProps = TabTriggerSlotProps & {
  icon: IconName;
  selectedIcon: IconName;
  children?: ReactNode;
};

/**
 * The chip behind the selected icon carries selection alongside the glyph's
 * own fill weight, because the two tabs whose pair is a barbell and a chart
 * read their filled state weakly at 24pt.
 */
function TabItem({ icon, selectedIcon, isFocused, ...props }: TabItemProps) {
  const theme = useTheme();

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.item,
        isFocused && { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <Icon
        name={isFocused ? selectedIcon : icon}
        size={24}
        tintColor={isFocused ? theme.accent : theme.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flex: 1,
  },
  slot: {
    flex: 1,
  },
  declaration: {
    display: 'none',
  },
  screen: {
    flex: 1,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    padding: Spacing.two,
    borderRadius: 999,
  },
  item: {
    width: 52,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
