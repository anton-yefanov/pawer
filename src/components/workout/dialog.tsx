import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

/**
 * An in-sheet dialog, rendered inside the screen rather than through
 * `Alert.alert`. A UIAlertController is presented from a view controller behind
 * the formSheet, so a system alert raised from there never reaches the screen —
 * it just logs a screens warning and the tap looks dead.
 */
export function Dialog({
  emoji,
  title,
  body,
  onDismiss,
  feedback = 'warn',
  children,
}: {
  emoji: string;
  title: string;
  body?: string;
  onDismiss: () => void;
  /** `tap` for a dialog the user asked for, like a rename prompt. */
  feedback?: 'warn' | 'tap';
  children: React.ReactNode;
}) {
  const theme = useTheme();

  // Mounted conditionally rather than toggled, so mount *is* the appearance.
  useEffect(() => {
    if (feedback === 'warn') haptics.warn();
    else haptics.tap();
  }, [feedback]);

  return (
    <View style={styles.overlay}>
      <Pressable
        style={[styles.scrim, { backgroundColor: theme.scrim }]}
        onPress={onDismiss}
        accessibilityLabel="Dismiss"
      />

      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <ThemedText style={styles.emoji}>{emoji}</ThemedText>
        <ThemedText type="smallBold" style={styles.title}>
          {title}
        </ThemedText>
        {body && (
          <ThemedText themeColor="textSecondary" style={styles.body}>
            {body}
          </ThemedText>
        )}

        {children}
      </View>
    </View>
  );
}

export function DialogButton({
  label,
  background,
  color,
  onPress,
}: {
  label: string;
  background: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={[styles.buttonLabel, { color }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  emoji: {
    fontSize: 34,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  button: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  buttonLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
