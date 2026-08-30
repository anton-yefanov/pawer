import type { NativeStackHeaderItem } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CircleButton, GlassCircle } from '@/components/circle-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

export function CloseButton({ onPress }: { onPress: () => void }) {
  return <CircleButton symbol="xmark" symbolSize={18} label="Close" onPress={onPress} />;
}

export function BackButton({ onPress }: { onPress: () => void }) {
  return <CircleButton symbol="chevron.left" symbolSize={18} label="Back" onPress={onPress} />;
}

/** Round accent confirm — the icon counterpart to `HeaderPillButton`. */
export function HeaderConfirmButton({
  onPress,
  disabled = false,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <CircleButton
      symbol="checkmark"
      symbolSize={20}
      label="Save"
      disabled={disabled}
      feedback="press"
      tintColor={disabled ? undefined : theme.accent}
      symbolColor={disabled ? theme.textSecondary : theme.accentContent}
      onPress={onPress}
    />
  );
}

/** The filled pill that sits in a sheet's top-right corner. */
export function HeaderPillButton({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <GlassCircle tintColor={theme.accent} style={styles.finish}>
      <Pressable
        onPress={() => {
          if (disabled) {
            haptics.reject();
            return;
          }
          haptics.press();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={[styles.finishContent, disabled && styles.disabled]}>
        <ThemedText type="headline" style={{ color: theme.accentContent }}>
          {title}
        </ThemedText>
      </Pressable>
    </GlassCircle>
  );
}

export function FinishButton({ onPress }: { onPress: () => void }) {
  return <HeaderPillButton title="Finish" onPress={onPress} />;
}

/**
 * A resizable sheet (`sheetAllowedDetents` with more than one detent) gives its
 * grabber the top of the nav bar, leaving the bar under 48pt of content height —
 * a full-size round button there is shaved along its top edge. Only the disc
 * shrinks; the bar is the same height either way, so it still lines up.
 */
export const HEADER_CIRCLE_SIZE = 44;

/** expo-router measures header slots tightly; the wrapper keeps the tap target square. */
export function HeaderSlot({ children }: { children: React.ReactNode }) {
  return <View style={styles.slot}>{children}</View>;
}

/**
 * For `unstable_headerLeftItems` / `unstable_headerRightItems`, which is the only
 * way to reach `hidesSharedBackground` — plain `headerLeft`/`headerRight` always
 * get iOS 26's shared glass background, and it renders flat and grey until the
 * first tap settles it. Every button here draws its own circle, so the shared
 * one is only ever a second, mismatched shape behind it.
 */
export function headerItem(element: React.ReactElement): NativeStackHeaderItem[] {
  return [{ type: 'custom', hidesSharedBackground: true, element }];
}

const styles = StyleSheet.create({
  slot: {
    justifyContent: 'center',
  },
  // A capsule rather than a circle: same height as the round buttons it shares
  // the bar with, but as wide as its label needs.
  finish: {
    width: 'auto',
  },
  finishContent: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.7,
  },
});
