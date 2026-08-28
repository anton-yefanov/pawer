import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleButton, CIRCLE_BUTTON_SIZE } from '@/components/circle-button';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export const STEP_COUNT = 3;

type Props = {
  index: number;
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

export function Step({ index, title, body, choices, children, onBack }: Props) {
  const insets = useSafeAreaInsets();
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
          <ThemedText type="smallBold" themeColor="textSecondary">
            {`Step ${index + 1} of ${STEP_COUNT}`}
          </ThemedText>
        </View>

        <View style={styles.copy}>
          <ThemedText type="title" style={styles.title}>
            {title}
          </ThemedText>
          {paragraphs.map((paragraph, position) => (
            <ThemedText
              key={paragraph}
              style={[styles.body, position > 0 && styles.followingParagraph]}>
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
  title: { fontSize: 28, lineHeight: 34, fontWeight: 700 },
  body: { fontSize: 19, lineHeight: 27 },
  followingParagraph: { marginTop: Spacing.two },
  choices: { marginTop: Spacing.five },
  // Every step ends here, so the primary button lands in the same place on all
  // of them — anything a step wants to say around it goes in the copy instead.
  bottom: { gap: Spacing.two },
});
