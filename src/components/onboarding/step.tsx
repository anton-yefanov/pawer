import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleButton, CIRCLE_BUTTON_SIZE } from '@/components/circle-button';
import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const STEP_COUNT = 3;

type Props = {
  index: number;
  /** Sits above the title, tinted accent — the step's subject at a glance. */
  icon: IconName;
  title: string;
  /** Several strings render as separate paragraphs. */
  body: string | string[];
  /** Sits directly under the copy, above the slack — a choice to make before
   *  the bottom slot's button becomes useful. */
  choices?: ReactNode;
  /** The bottom slot: the buttons that leave the step. */
  children: ReactNode;
  /** Absent on the first step, which has nowhere to go back to. */
  onBack?: () => void;
};

export function Step({ index, icon, title, body, choices, children, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const paragraphs = Array.isArray(body) ? body : [body];

  return (
    <View
      style={[
        styles.page,
        { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four },
      ]}>
      <View style={styles.content}>
        <View style={styles.header}>
          {onBack ? (
            <View style={styles.back}>
              <CircleButton symbol="chevron.left" label="Back" onPress={onBack} />
            </View>
          ) : null}
          <ThemedText type="footnote" weight="semibold" themeColor="textSecondary">
            {`Step ${index + 1} of ${STEP_COUNT}`}
          </ThemedText>
        </View>

        <View style={styles.copy}>
          <View style={styles.icon}>
            <Icon name={icon} size={44} tintColor={theme.accent} />
          </View>
          <ThemedText type="title1">{title}</ThemedText>
          {paragraphs.map((paragraph, position) => (
            <ThemedText
              key={paragraph}
              style={position > 0 && styles.followingParagraph}>
              {paragraph}
            </ThemedText>
          ))}
          {choices ? <View style={styles.choices}>{choices}</View> : null}
        </View>

        <View style={styles.bottom}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { ...StyleSheet.absoluteFill, paddingHorizontal: Spacing.four },
  content: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: {
    height: CIRCLE_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  // Absolute so the step count stays centred on the page, not on the space left
  // over beside the button.
  back: { position: 'absolute', left: 0 },
  // The copy takes all the slack so it holds the middle of the page on every
  // step, which is what keeps the bottom slot in one place.
  copy: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  icon: { alignSelf: 'flex-start' },
  followingParagraph: { marginTop: Spacing.two },
  choices: { marginTop: Spacing.five },
  // Every step ends here, so the primary button lands in the same place on all
  // of them — anything a step wants to say around it goes in the copy instead.
  bottom: { gap: Spacing.two },
});
