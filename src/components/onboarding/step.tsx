import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  LinearTransition,
  useReducedMotion,
  withDelay,
  withTiming,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CIRCLE_BUTTON_SIZE, CircleButton } from '@/components/circle-button';
import { FloatingSurface } from '@/components/floating-surface';
import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function Step({
  title,
  body,
  art,
  choices,
  children,
  eyebrow,
  centered = false,
}: {
  title: string;
  body?: string;
  /** Takes whatever height the page has left above the title, so the choices sit by the button. */
  art?: ReactNode;
  choices?: ReactNode;
  children?: ReactNode;
  eyebrow?: string;
  centered?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const align = centered && styles.centered;
  return (
    <View style={[styles.column, styles.page, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          art != null && styles.contentWithArt,
          centered && styles.contentCentered,
        ]}
        showsVerticalScrollIndicator={false}
        // Still scrolls when a page genuinely overflows (a long import review, a small phone).
        alwaysBounceVertical={false}
      >
        {art != null && <View style={styles.art}>{art}</View>}
        {eyebrow && (
          <ThemedText type="footnote" weight="semibold" themeColor="accent" style={align}>
            {eyebrow}
          </ThemedText>
        )}
        <ThemedText accessibilityRole="header" type="largeTitle" style={align}>
          {title}
        </ThemedText>
        {body && (
          <ThemedText type="callout" themeColor="textSecondary" style={align}>
            {body}
          </ThemedText>
        )}
        {choices && <View style={styles.choices}>{choices}</View>}
      </ScrollView>
      {children && <View style={styles.bottom}>{children}</View>}
    </View>
  );
}

/** The picture above a question: a placeholder until an answer is picked, then that answer's. */
export function ChoiceArt({ icon, placeholder }: { icon: IconName | null; placeholder: IconName }) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  return (
    <View
      style={[
        styles.artTile,
        { backgroundColor: icon ? theme.accentTint : theme.backgroundElement },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        key={icon ?? 'placeholder'}
        style={styles.artIcon}
        entering={reducedMotion ? undefined : ZoomIn.duration(260).easing(Easing.out(Easing.cubic))}
        exiting={reducedMotion ? undefined : ZoomOut.duration(160)}
      >
        <Icon
          name={icon ?? placeholder}
          size={ART_ICON}
          tintColor={icon ? theme.accent : theme.textTertiary}
        />
      </Animated.View>
    </View>
  );
}

/** Outside the sliding pages, so it stays put while they move under it. */
export function StepHeader({
  index,
  count,
  onBack,
}: {
  index: number;
  count: number;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  return (
    <View style={[styles.column, styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.back}>
        {onBack && (
          <Animated.View
            entering={reducedMotion ? undefined : drop(0)}
            exiting={reducedMotion ? undefined : lift}
          >
            <CircleButton symbol="chevron.left" label="Back" onPress={onBack} />
          </Animated.View>
        )}
      </View>
      {/* The welcome page is the cover and the commitment is the finish line; the bar
          only accompanies the steps in between. */}
      {index > 0 && index < count - 1 && (
        <Animated.View
          style={styles.progressSlot}
          entering={reducedMotion ? undefined : drop(60)}
          exiting={reducedMotion ? undefined : lift}
        >
          <FloatingSurface
            style={styles.progress}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: count, now: index + 1 }}
            accessibilityLabel="Onboarding progress"
          >
            <Animated.View
              layout={LinearTransition}
              style={[
                styles.progressFill,
                { width: `${((index + 1) / count) * 100}%`, backgroundColor: theme.accent },
              ]}
            />
          </FloatingSurface>
        </Animated.View>
      )}
    </View>
  );
}

// Transform only: fading a glass surface in would flatten it.
const OFFSTAGE = -120;
const ARRIVE = { duration: 420, easing: Easing.out(Easing.cubic) };

function drop(delay: number) {
  return () => {
    'worklet';
    return {
      initialValues: { transform: [{ translateY: OFFSTAGE }, { scale: 0.9 }] },
      animations: {
        transform: [
          { translateY: withDelay(delay, withTiming(0, ARRIVE)) },
          { scale: withDelay(delay, withTiming(1, ARRIVE)) },
        ],
      },
    };
  };
}

function lift() {
  'worklet';
  return {
    initialValues: { transform: [{ translateY: 0 }, { scale: 1 }] },
    animations: {
      transform: [
        { translateY: withTiming(OFFSTAGE, { duration: 220 }) },
        { scale: withTiming(0.9, { duration: 220 }) },
      ],
    },
  };
}

const PROGRESS_INSET = 16;
const ART_TILE = 180;
const ART_ICON = 84;

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  page: { flex: 1 },
  // The same breathing room above the scrolling page as `bottom` leaves below it.
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12 },
  // Holds the row's height on the welcome page, where it is empty.
  back: { width: CIRCLE_BUTTON_SIZE, height: CIRCLE_BUTTON_SIZE },
  // No `overflow: 'hidden'` — like CircleButton, clipping would trap the glass's stretch.
  progressSlot: { flex: 1 },
  progress: {
    height: CIRCLE_BUTTON_SIZE,
    borderRadius: CIRCLE_BUTTON_SIZE / 2,
    padding: PROGRESS_INSET,
    justifyContent: 'center',
  },
  progressFill: {
    height: CIRCLE_BUTTON_SIZE - PROGRESS_INSET * 2,
    minWidth: CIRCLE_BUTTON_SIZE - PROGRESS_INSET * 2,
    borderRadius: (CIRCLE_BUTTON_SIZE - PROGRESS_INSET * 2) / 2,
  },
  scroll: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: 20, gap: 12 },
  contentWithArt: { paddingBottom: 12 },
  // A statement rather than a form: narrower lines, more air at the sides.
  contentCentered: { paddingHorizontal: 16, gap: 16 },
  art: { flex: 1, minHeight: ART_TILE + 24, alignItems: 'center', justifyContent: 'center' },
  artTile: {
    width: ART_TILE,
    height: ART_TILE,
    borderRadius: 48,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artIcon: { position: 'absolute' },
  choices: { marginTop: 12, gap: 10 },
  centered: { textAlign: 'center' },
  bottom: { gap: 8, paddingTop: 12 },
});
