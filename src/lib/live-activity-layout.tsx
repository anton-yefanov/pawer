import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  frame,
  font,
  foregroundStyle,
  lineLimit,
  monospacedDigit,
  multilineTextAlignment,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';

import { guardSync } from '@/lib/observability';

/**
 * Everything the layout renders, flat and already formatted.
 *
 * The layout function below is stringified by `babel-preset-expo`'s widget
 * plugin and re-evaluated in the extension's own JS runtime, where the only
 * bindings in scope are the ones `expo-widgets` puts on `globalThis`: the
 * `@expo/ui/swift-ui` components and modifiers, and the JSX runtime. It closes
 * over nothing — not a module constant, not a helper, not a type assertion —
 * so every unit, colour and phrase is decided in `live-activity.tsx` and
 * arrives here as a prop. Nothing below chooses wording.
 *
 * The clocks are the exception. `Text(timerInterval:)` ticks on the SwiftUI
 * side, so elapsed time and the rest countdown both stay live without a single
 * ActivityKit update.
 */
export type WorkoutActivityProps = {
  /** The workout, in the quiet line above everything. */
  title: string;
  /** What's happening now: the current exercise, or `Rest`. */
  headline: string;
  /** `Set 2 of 4`, or what's up after the rest. */
  subline: string | null;
  startedAt: number;
  /** Set once the workout is over: it caps the elapsed range, freezing the clock. */
  endedAt: number | null;
  restStartedAt: number | null;
  restEndsAt: number | null;
  setsLabel: string;
  volumeLabel: string;
  exercisesLabel: string;
  tint: string;
};

const buildWorkoutActivity = () =>
  createLiveActivity<WorkoutActivityProps>(
  'WorkoutActivity',
  (props) => {
    'widget';

    const glyphName = 'figure.strengthtraining.traditional';
    const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

    const resting = props.restEndsAt != null && props.restStartedAt != null;
    const restRange = {
      lower: new Date(props.restStartedAt ?? 0),
      upper: new Date(props.restEndsAt ?? 0),
    };

    // Both clocks go through `timerInterval` rather than `dateStyle="timer"`:
    // the latter renders as "1 hour, 17 minutes" in the Lock Screen banner
    // while staying `1:17:26` in the Dynamic Island, and only this form is
    // consistent across every slot.
    //
    // The upper bound is eight hours because that is ActivityKit's own ceiling
    // on how long an activity may run — past it there is nothing left to render
    // — and it costs width to overshoot: the slot reserves room for the widest
    // value in the range, so a longer bound only buys a `2` that never shows.
    //
    // A `timerInterval` Text stops at the upper bound, so ending the workout
    // pins the bound to `endedAt` and the clock holds the final duration rather
    // than counting on through the activity's dismissal window.
    const elapsedRange = {
      lower: new Date(props.startedAt),
      upper: new Date(props.endedAt ?? props.startedAt + 8 * 60 * 60 * 1000),
    };

    // Every slot needs an explicit width. Left to themselves these views
    // stretch to fill, which in the Dynamic Island drags the pill across the
    // whole screen; `fixedSize` is not the escape hatch, it collapses a
    // `timerInterval` to nothing rather than shrinking it. A clock's width also
    // has to clear what SwiftUI reserves for the widest value in its range,
    // never just what it reads now, or the text truncates mid-tick.

    // `multilineTextAlignment` is what pins the clock to the right edge. A
    // `timerInterval` Text sizes itself for the widest value in its range and
    // draws the current, shorter one leading-aligned inside that box, so the
    // slack sits to its right and no amount of `frame` alignment moves it —
    // the frame has nothing left to align. This aligns the glyphs themselves.
    const clock = (size: number, modifiers: ReturnType<typeof frame>[] = []) => (
      <Text
        timerInterval={elapsedRange}
        countsDown={false}
        modifiers={[
          font({ size, weight: 'semibold', design: 'rounded' }),
          monospacedDigit(),
          multilineTextAlignment('trailing'),
          ...modifiers,
        ]}
      />
    );

    const glyph = (size: number, modifiers: ReturnType<typeof frame>[] = []) => (
      <Image systemName={glyphName} size={size} color={props.tint} modifiers={modifiers} />
    );

    const openArrow = (size: number, modifiers: ReturnType<typeof frame>[] = []) => (
      <Image
        systemName="arrow.forward.circle.fill"
        size={size}
        color={props.tint}
        modifiers={modifiers}
      />
    );

    const titleRow = (
      <HStack spacing={5}>
        {glyph(13)}
        <Text modifiers={[font({ size: 13, weight: 'medium' }), secondary, lineLimit(1)]}>
          {props.title}
        </Text>
      </HStack>
    );

    const headlineBlock = (
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 18, weight: 'semibold' }), lineLimit(1)]}>
          {props.headline}
        </Text>
        {props.subline == null ? null : (
          <Text modifiers={[font({ size: 13 }), secondary, lineLimit(1)]}>{props.subline}</Text>
        )}
      </VStack>
    );

    // Packed left and hugging its content — no Spacer inside. A Spacer here
    // expands the row to the container's full width, which clips it against the
    // rounding in the banner and shoves the clock off the edge in the island.
    const stats = (
      <HStack spacing={14}>
        <Text modifiers={[font({ size: 12 }), secondary]}>{props.setsLabel}</Text>
        <Text modifiers={[font({ size: 12 }), secondary]}>{props.volumeLabel}</Text>
        <Text modifiers={[font({ size: 12 }), secondary]}>{props.exercisesLabel}</Text>
      </HStack>
    );

    // `ProgressView(timerInterval:)` draws its own countdown beside the bar and
    // there is no way through to SwiftUI's `currentValueLabel` to replace it, so
    // this is the rest clock — the elapsed one above never switches to rest.
    const restBar = (
      <ProgressView
        timerInterval={restRange}
        countsDown
        modifiers={[foregroundStyle(props.tint)]}
      />
    );

    return {
      // The banner does not inset its content — anything at the content's own
      // edge is clipped by the card's corner radius — so the inset is ours to
      // provide, and it has to clear the rounding.
      banner: (
        <VStack
          alignment="leading"
          spacing={10}
          modifiers={[padding({ horizontal: 16, vertical: 12 })]}
        >
          {titleRow}

          <HStack alignment="firstTextBaseline" spacing={10}>
            {headlineBlock}
            <Spacer />
            {clock(30)}
          </HStack>

          {resting ? restBar : stats}
        </VStack>
      ),

      // Two glyphs and no clock. The compact pill can never be narrower than
      // the sensor housing between its halves, so the only way to keep it small
      // is to put nothing wide in either half — a timer reserving room for
      // `7:59:59` is what made it sprawl. The elapsed time is one long press
      // away in the expanded layout.
      compactLeading: glyph(15, [frame({ width: 18 })]),
      compactTrailing: openArrow(15, [frame({ width: 18 })]),
      minimal: glyph(16, [frame({ width: 20 })]),

      // Everything lives in the bottom region. The leading and trailing regions
      // only span the narrow row either side of the sensor housing, which pins
      // their content to the top and leaves no way to centre the clock against
      // the text; the bottom region is the full width below it. Its content is
      // clipped by the rounding just like the banner's, so it carries its own
      // inset too.
      expandedBottom: (
        <HStack alignment="center" spacing={12} modifiers={[padding({ horizontal: 10, vertical: 4 })]}>
          <VStack alignment="leading" spacing={6}>
            {titleRow}
            {headlineBlock}
            {resting ? restBar : stats}
          </VStack>
          <Spacer />
          {clock(26, [frame({ width: 98, alignment: 'trailing' })])}
        </HStack>
      ),
    };
  }
);

/**
 * Registering the activity reaches the native `ExpoWidgetsModule` at import
 * time, so a build whose widget extension is missing or renamed throws before
 * any React code runs. A null factory makes the Live Activity a no-op instead.
 */
export const workoutActivity = guardSync('live-activity', buildWorkoutActivity) ?? null;
