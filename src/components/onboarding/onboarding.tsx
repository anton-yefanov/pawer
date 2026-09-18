import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  interpolateColor,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';

import { Card, ROW_ICON_INSET, RowIcon, Separator } from '@/components/grouped-list';
import { Icon, type IconName } from '@/components/icon';
import { ImportButton, ImportReview, useImportReview } from '@/components/import/import-review';
import { Pressable } from '@/components/pressable';
import { MenuRow } from '@/components/settings/menu-row';
import { ThemedText } from '@/components/themed-text';
import { BigButton } from '@/components/workout/big-button';
import { Colors, Spacing } from '@/constants/theme';
import { TINT_OPTIONS } from '@/constants/tints';
import { useTheme } from '@/hooks/use-theme';
import { db } from '@/db/client';
import { getSetting } from '@/db/seed';
import * as haptics from '@/lib/haptics';
import {
  openLegalDocument,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
  WORKOUT_IMPORT_TOOL_URL,
} from '@/lib/legal';
import { ensureNotificationPermission } from '@/lib/notifications';
import { BODY_SEXES, useBodySexPreference } from '@/lib/body-sex';
import { attempt, report } from '@/lib/observability';
import { useOnboarding } from '@/lib/onboarding';
import { buildPersonalPlan, isPlanAnswers, type PlanAnswers } from '@/lib/personal-plan';
import { usePro } from '@/lib/purchases';
import { PERSONAL_PLAN_KEY, savePersonalPlan } from '@/lib/save-personal-plan';
import { track } from '@/lib/telemetry';
import { ColorSchemeOverride, useThemePreference } from '@/lib/theme-preference';
import { WEIGHT_UNITS, useWeightUnitPreference } from '@/lib/weight-unit';

import { AnatomyPreview } from './appearance';
import { PaywallPage } from './paywall-page';
import { PlanFolder, TINT_FOLDER } from './plan-folder';
import { WelcomeHero } from './welcome-hero';
import { CommitButton, HOLD_MS } from './commit-button';
import { FocusGrid, toggleFocus } from './focus-grid';
import { ChoiceArt, Step, StepHeader } from './step';

const PEEK_RADIUS = 110;

const GOAL_PHRASE: Record<PlanAnswers['goal'], string> = {
  muscle: 'build muscle',
  strength: 'get stronger',
  consistency: 'make training a habit',
};

const SAVE_FAILED = {
  title: 'Couldn’t save that',
  message: 'Your choice wasn’t saved. Please try again.',
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
type StepName =
  | 'welcome'
  | 'history'
  | 'import'
  | 'goal'
  | 'focus'
  | 'experience'
  | 'equipment'
  | 'days'
  | 'minutes'
  | 'preferences'
  | 'notifications'
  | 'plan'
  | 'paywall'
  | 'commit';
const STEPS: StepName[] = [
  'welcome',
  'history',
  'goal',
  'focus',
  'experience',
  'equipment',
  'days',
  'minutes',
  'preferences',
  'notifications',
  'plan',
  'paywall',
  'commit',
];

const QUESTIONS = {
  goal: {
    icon: 'flame.fill',
    title: 'What’s your goal?',
    choices: [
      {
        id: 'muscle',
        title: 'Build muscle',
        detail: 'Make every rep count',
        icon: 'dumbbell.fill',
      },
      {
        id: 'strength',
        title: 'Get stronger',
        detail: 'Build confidence under the weight',
        icon: 'bolt.fill',
      },
      {
        id: 'consistency',
        title: 'Build a lasting habit',
        detail: 'A routine you’ll want to come back to',
        icon: 'calendar',
      },
    ],
  },
  experience: {
    icon: 'chart.line.uptrend.xyaxis',
    title: 'Where are you starting?',
    choices: [
      {
        id: 'new',
        title: 'I’m new to strength training',
        detail: 'Simple movements. A manageable start',
        icon: 'hand.wave.fill',
      },
      {
        id: 'returning',
        title: 'I have some experience',
        detail: 'I know the basics or I’m coming back',
        icon: 'arrow.clockwise',
      },
      {
        id: 'experienced',
        title: 'I train regularly',
        detail: 'Ready for a more demanding routine',
        icon: 'dumbbell.fill',
      },
    ],
  },
  equipment: {
    icon: 'dumbbell.fill',
    title: 'Your training setup',
    choices: [
      {
        id: 'gym',
        title: 'A fully equipped gym',
        detail: 'Machines, cables and free weights',
        icon: 'dumbbell.fill',
      },
      {
        id: 'dumbbells',
        title: 'Dumbbells and a bench',
        detail: 'A pair of weights. Plenty of possibilities',
        icon: 'house.fill',
      },
      {
        id: 'bodyweight',
        title: 'Just my bodyweight',
        detail: 'Floor space is all you need',
        icon: 'figure.strengthtraining.traditional',
      },
    ],
  },
  days: {
    icon: 'calendar',
    title: 'Make room for your goals',
    choices: [
      { id: 2, title: '2 days', detail: 'A steady start with room to recover', icon: 'calendar' },
      { id: 3, title: '3 days', detail: 'A balanced rhythm for the week', icon: 'calendar' },
      { id: 4, title: '4 days', detail: 'More time to make training your own', icon: 'calendar' },
    ],
  },
  minutes: {
    icon: 'clock.fill',
    title: 'How much time is yours?',
    choices: [
      {
        id: 20,
        title: 'About 20 minutes',
        detail: 'The essentials. Make them count',
        icon: 'bolt.fill',
      },
      {
        id: 35,
        title: 'About 35 minutes',
        detail: 'Room to focus on every movement',
        icon: 'clock',
      },
      {
        id: 50,
        title: 'About 50 minutes',
        detail: 'More room for volume and recovery',
        icon: 'dumbbell.fill',
      },
    ],
  },
} satisfies Record<
  Exclude<keyof PlanAnswers, 'focus'>,
  {
    /** The placeholder art until an answer is picked. */
    icon: IconName;
    title: string;
    choices: { id: string | number; title: string; detail: string; icon: IconName }[];
  }
>;

export function Onboarding() {
  const { done } = useOnboarding();
  return done ? null : <OnboardingFlow />;
}

function OnboardingFlow() {
  const theme = useTheme();
  const { complete } = useOnboarding();
  const router = useRouter();
  const pathname = usePathname();
  const isPro = usePro();
  const { unit, setUnit } = useWeightUnitPreference();
  const { tint, setTint } = useThemePreference();
  const { sex, setSex } = useBodySexPreference();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState<StepName>('welcome');
  const [restoring, setRestoring] = useState(true);
  const [usedApps, setUsedApps] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<Partial<PlanAnswers>>({});
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [screenReader, setScreenReader] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [origin, setOrigin] = useState({ x: width / 2, y: height * 0.7 });
  const radius = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  // Read by the exiting page's worklet after the commit, so it can't come from props.
  const direction = useSharedValue<1 | -1>(1);
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.get() }));
  // Land on Home under the promise page, after the paywall has come and gone — that is
  // the screen the hold peeks at and the reveal opens onto.
  useEffect(() => {
    if (step === 'commit') router.navigate('/');
  }, [router, step]);

  // The backdrop dusks to black under the promise page as it slides in.
  const dusk = useSharedValue(0);
  useEffect(() => {
    dusk.set(withTiming(step === 'commit' ? 1 : 0, { duration: 420 }));
  }, [dusk, step]);
  const backdropProps = useAnimatedProps(() => ({
    fill: interpolateColor(dusk.get(), [0, 1], [theme.background, Colors.dark.background]),
  }));
  const circleProps = useAnimatedProps(() => ({ r: reducedMotion ? 0 : radius.get() }));
  const revealStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? contentOpacity.get() : 1,
  }));
  // The commit page is painted by the masked layer rather than the overlay, so the hold can cut into it.
  const unveiling = revealing || step === 'commit';
  const importing =
    step === 'import' &&
    (pathname.startsWith('/settings/import') || pathname === '/settings/new-exercise');
  const steps = usedApps ? [...STEPS.slice(0, 2), 'import' as const, ...STEPS.slice(2)] : STEPS;
  const index = steps.indexOf(step);
  const ready =
    answers.goal && answers.experience && answers.equipment && answers.days && answers.minutes;
  const plan = useMemo(
    () => (ready ? buildPersonalPlan(answers as PlanAnswers) : null),
    [answers, ready]
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getSetting(db, PERSONAL_PLAN_KEY), getSetting(db, 'onboarding_plan_answers')])
      .then(([saved, encoded]) => {
        if (cancelled || !saved || !encoded) return;
        const restored: unknown = JSON.parse(encoded);
        if (isPlanAnswers(restored)) {
          setAnswers(restored);
          // An interrupted purchase or reveal resumes with the plan already saved.
          setStep('paywall');
        }
      })
      .catch((cause) => report('onboarding', cause, { phase: 'resume' }))
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!restoring) track('onboarding_step_viewed', { name: step });
  }, [step, restoring]);
  useEffect(() => {
    void AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader);
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => subscription.remove();
  }, []);

  function go(next: StepName) {
    if (busyRef.current) return;
    setError(null);
    direction.set(steps.indexOf(next) < index ? -1 : 1);
    setStep(next);
  }
  function back() {
    if (index > 0 && step !== 'commit' && step !== 'paywall') go(steps[index - 1]);
  }
  useEffect(() => {
    if (importing) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => subscription.remove();
  });

  useEffect(() => {
    // Someone who already owns Pro has nothing to be offered.
    if (step === 'paywall' && isPro) go('commit');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isPro]);

  async function preparePlan() {
    if (!ready || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      savePersonalPlan(answers as PlanAnswers, db, TINT_FOLDER[tint]);
      direction.set(1);
      setStep('paywall');
    } catch (cause) {
      report('onboarding', cause, { phase: 'plan' });
      setError('Your plan couldn’t be saved. Please try again.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function finish() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await complete(
        () =>
          new Promise<void>((resolve) => {
            setRevealing(true);
            haptics.complete();
            contentOpacity.set(withTiming(0, { duration: reducedMotion ? 120 : 180 }));
            const reach =
              Math.hypot(
                Math.max(origin.x, width - origin.x),
                Math.max(origin.y, height - origin.y)
              ) + 4;
            radius.set(
              withTiming(
                reach,
                { duration: reducedMotion ? 160 : 650, easing: Easing.inOut(Easing.cubic) },
                (finished) => {
                  if (finished) scheduleOnRN(resolve);
                }
              )
            );
          })
      );
      track('onboarding_completed', { notifications_granted: notificationsGranted });
    } catch (cause) {
      report('onboarding', cause, { phase: 'complete' });
      setError('Couldn’t save your progress. Your plan is safe. Please try again.');
      busyRef.current = false;
      setBusy(false);
    }
  }

  // While the finger is down the app starts showing through around the button;
  // letting go closes it again, finishing the hold opens it the rest of the way.
  function peek(at: { x: number; y: number }) {
    if (busyRef.current || reducedMotion) return;
    setOrigin(at);
    radius.set(withTiming(PEEK_RADIUS, { duration: HOLD_MS, easing: Easing.in(Easing.cubic) }));
  }

  const common = {
    index,
    count: steps.length,
    // Stays mounted while busy — `go` already ignores it then, and unmounting replays its entrance.
    onBack: index > 0 && step !== 'commit' && step !== 'paywall' ? back : undefined,
  };
  const questionKey = step in QUESTIONS ? (step as keyof typeof QUESTIONS) : null;
  let page;
  if (questionKey) {
    const question = QUESTIONS[questionKey];
    page = (
      <Step
        title={question.title}
        art={
          <ChoiceArt
            placeholder={question.icon}
            icon={
              question.choices.find((option) => option.id === answers[questionKey])?.icon ?? null
            }
          />
        }
        choices={question.choices.map((option) => (
          <Choice
            key={option.id}
            title={option.title}
            detail={option.detail}
            selected={answers[questionKey] === option.id}
            onPress={() => {
              haptics.select();
              setAnswers((current) => ({ ...current, [questionKey]: option.id }));
            }}
          />
        ))}
      >
        <BigButton
          title="Continue"
          onPress={() => go(steps[index + 1])}
          disabled={answers[questionKey] == null || busy}
        />
      </Step>
    );
  } else if (step === 'focus') {
    const focus = answers.focus ?? [];
    page = (
      <Step
        title="Any muscle groups you want to focus on?"
        choices={
          <FocusGrid
            selected={focus}
            onToggle={(area) => {
              haptics.select();
              setAnswers((current) => ({
                ...current,
                focus: toggleFocus(current.focus ?? [], area),
              }));
            }}
          />
        }
      >
        <BigButton
          title={focus.length > 0 ? 'Continue' : 'No Focus Area'}
          variant={focus.length > 0 ? 'filled' : 'tinted'}
          onPress={() => {
            setAnswers((current) => ({ ...current, focus }));
            go(steps[index + 1]);
          }}
          disabled={busy}
        />
      </Step>
    );
  } else if (step === 'welcome') {
    page = (
      <Step
        centered
        title={'Your next chapter\nstarts here'}
        body="A plan built around your goal, your schedule and your starting point"
        art={<WelcomeHero color={TINT_FOLDER[tint]} />}
      >
        <BigButton title="Build My Plan" onPress={() => go('history')} />
        <View style={styles.legal}>
          <LegalLink title="Terms of Service" url={TERMS_OF_SERVICE_URL} />
          <LegalLink title="Privacy Policy" url={PRIVACY_POLICY_URL} />
        </View>
      </Step>
    );
  } else if (step === 'history') {
    page = (
      <Step
        title="Already tracking your workouts?"
        art={
          <ChoiceArt
            placeholder="clock.arrow.circlepath"
            icon={
              usedApps === null ? null : usedApps ? 'square.and.arrow.down' : 'bolt.fill'
            }
          />
        }
        choices={
          <>
            <Choice
              title="Yes, I’ve used another app"
              detail="Bring your progress into Pawer"
              selected={usedApps === true}
              onPress={() => {
                haptics.select();
                setUsedApps(true);
              }}
            />
            <Choice
              title="No, I’m starting here"
              detail="Your first entry is waiting"
              selected={usedApps === false}
              onPress={() => {
                haptics.select();
                setUsedApps(false);
              }}
            />
          </>
        }
      >
        <BigButton
          title="Continue"
          onPress={() => go(usedApps ? 'import' : 'goal')}
          disabled={usedApps === null}
        />
      </Step>
    );
  } else if (step === 'import') {
    page = <ImportStep onNext={() => go('goal')} />;
  } else if (step === 'preferences') {
    page = (
      <Step
        title="Make Pawer feel like you"
        art={<AnatomyPreview sex={sex} />}
        choices={
          // The grouped card carries its own sheet-width inset; this page already pads its edges.
          <View style={styles.bleed}>
            <Card>
              <MenuRow
                label="Tint Color"
                leading={<RowIcon name="paintpalette" />}
                options={TINT_OPTIONS}
                selected={tint}
                trailing={<View style={[styles.swatch, { backgroundColor: theme.accent }]} />}
                onSelect={(next) => void attempt('onboarding', setTint(next), SAVE_FAILED)}
              />
              <Separator inset={ROW_ICON_INSET} />
              <MenuRow
                label="Body Diagram"
                leading={<RowIcon name="figure.strengthtraining.traditional" />}
                options={BODY_SEXES}
                selected={sex}
                onSelect={(next) => void attempt('onboarding', setSex(next), SAVE_FAILED)}
              />
              <Separator inset={ROW_ICON_INSET} />
              <MenuRow
                label="Weight Unit"
                leading={<RowIcon name="dumbbell" />}
                options={WEIGHT_UNITS}
                selected={unit}
                onSelect={(next) => void attempt('onboarding', setUnit(next), SAVE_FAILED)}
              />
            </Card>
          </View>
        }
      >
        <BigButton title="Continue" onPress={() => go('notifications')} />
      </Step>
    );
  } else if (step === 'notifications') {
    page = (
      <Step
        title="Know when rest is over"
        body="Pawer can send a notification the moment your rest timer ends, so you can put your phone down between sets"
        art={<ChoiceArt placeholder="bell.badge.fill" icon={notificationsGranted ? 'bell.badge.fill' : null} />}
      >
        <BigButton
          title="Allow Notifications"
          disabled={busy}
          onPress={() => {
            if (busyRef.current) return;
            busyRef.current = true;
            setBusy(true);
            void ensureNotificationPermission()
              .then(setNotificationsGranted)
              .catch((cause) => report('onboarding', cause))
              .finally(() => {
                busyRef.current = false;
                setBusy(false);
                go('plan');
              });
          }}
        />
        <BigButton title="Not Now" variant="tinted" disabled={busy} onPress={() => go('plan')} />
      </Step>
    );
  } else if (step === 'plan' && plan) {
    const minutes = Math.max(...plan.workouts.map((workout) => workout.estimatedMinutes));
    page = (
      <Step
        title="Your plan is ready"
        body={`${plan.workouts.length} workouts · ${plan.days} days a week · ~${minutes} min`}
        art={<PlanFolder color={TINT_FOLDER[tint]} />}
      >
        <BigButton
          title={busy ? 'Saving Your Plan…' : 'Make It Mine'}
          onPress={() => void preparePlan()}
          disabled={busy}
        />
      </Step>
    );
  } else if (step === 'paywall') {
    page = isPro ? null : <PaywallPage onDone={() => go('commit')} />;
  } else {
    page = (
      // The one dark page, whatever the appearance: the promise is a moment, not another form.
      <ColorSchemeOverride scheme="dark">
        <StatusBar style="light" />
        <Step
          centered
          eyebrow="MY PROMISE"
          title="I promise to follow my goals"
          choices={
            <View style={styles.promise}>
              {ready && (
                <ThemedText type="title3" weight="regular" style={styles.center}>
                  I’ll show up {answers.days} days a week, {answers.minutes} minutes at a time, to{' '}
                  {GOAL_PHRASE[answers.goal!]}
                </ThemedText>
              )}
              <ThemedText type="callout" themeColor="textSecondary" style={styles.center}>
                Some days will be hard. I’ll show up anyway
              </ThemedText>
            </View>
          }
        >
          <View style={styles.commitment}>
            <CommitButton
              busy={busy}
              screenReader={screenReader}
              onHoldStart={peek}
              onHoldCancel={() => {
                // A lift right as the hold completes must not pull the reveal back shut.
                if (busyRef.current) return;
                radius.set(withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }));
              }}
              onCommit={() => void finish()}
            />
            <ThemedText type="headline" themeColor={busy ? 'accent' : 'textSecondary'}>
              {busy ? 'Welcome to Pawer' : screenReader ? 'Double tap to sign' : 'Hold to sign'}
            </ThemedText>
          </View>
        </Step>
      </ColorSchemeOverride>
    );
  }

  return (
    <View
      accessibilityViewIsModal
      style={[
        styles.overlay,
        {
          display: importing ? 'none' : 'flex',
          backgroundColor: unveiling ? 'transparent' : theme.background,
        },
      ]}
    >
      {unveiling && (
        <Animated.View style={[StyleSheet.absoluteFill, revealStyle]} pointerEvents="none">
          <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <Mask
                id="onboarding-reveal"
                x={0}
                y={0}
                width={width}
                height={height}
                maskUnits="userSpaceOnUse"
              >
                <Rect width={width} height={height} fill="white" />
                <AnimatedCircle
                  cx={origin.x}
                  cy={origin.y}
                  animatedProps={circleProps}
                  fill="black"
                />
              </Mask>
            </Defs>
            <AnimatedRect
              width={width}
              height={height}
              animatedProps={backdropProps}
              mask="url(#onboarding-reveal)"
            />
          </Svg>
        </Animated.View>
      )}
      <Animated.View
        style={[styles.flex, contentStyle]}
        pointerEvents={revealing ? 'none' : 'auto'}
        accessibilityElementsHidden={revealing}
      >
        {!restoring && step !== 'paywall' && <StepHeader {...common} />}
        {restoring ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.accent} accessibilityLabel="Preparing onboarding" />
          </View>
        ) : (
          <Animated.View
            key={step}
            entering={reducedMotion ? undefined : slideIn(direction, width)}
            exiting={reducedMotion ? undefined : slideOut(direction, width)}
            style={styles.flex}
          >
            {page}
          </Animated.View>
        )}
        {error && (
          <View
            accessibilityRole="alert"
            style={[styles.error, { backgroundColor: theme.surface }]}
          >
            <ThemedText type="footnote" themeColor="danger">
              {error}
            </ThemedText>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

function Choice({
  title,
  detail,
  selected,
  onPress,
}: {
  title: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: selected ? theme.accentTint : theme.surface,
          borderColor: selected ? theme.accent : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.flex}>
        <ThemedText type="headline">{title}</ThemedText>
        <ThemedText type="footnote" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>
      <View
        style={[
          styles.radio,
          {
            borderColor: selected ? theme.accent : theme.chevron,
            backgroundColor: selected ? theme.accent : 'transparent',
          },
        ]}
      >
        {selected && <Icon name="checkmark" size={12} tintColor={theme.accentContent} />}
      </View>
    </Pressable>
  );
}
function ImportStep({ onNext }: { onNext: () => void }) {
  const state = useImportReview(onNext);
  if (state.file) {
    return (
      <Step
        title="Here’s what we found"
        choices={
          <View style={styles.bleed}>
            <ImportReview state={state} />
          </View>
        }
      >
        {state.workouts.length > 0 ? (
          <ImportButton state={state} />
        ) : (
          <BigButton title="Continue" onPress={onNext} />
        )}
        <BigButton title="Skip for Now" variant="tinted" onPress={onNext} />
      </Step>
    );
  }
  return (
    <Step
      title="Your effort comes with you"
      art={<ChoiceArt placeholder="square.and.arrow.down" icon="square.and.arrow.down" />}
      choices={
        <>
          <ActionRow
            title="Upload CSV"
            detail="From Pawer, Strong or Hevy"
            trailing="chevron.right"
            onPress={() => void state.choose()}
          />
          <ActionRow
            title="Convert any format"
            detail="Turn notes or another app’s export into a CSV"
            trailing="arrow.up.right"
            onPress={() => void attempt('import', openLegalDocument(WORKOUT_IMPORT_TOOL_URL))}
          />
        </>
      }
    >
      <BigButton title="Skip for Now" variant="tinted" onPress={onNext} />
    </Step>
  );
}

/** A `Choice` that does something instead of selecting — same card, an arrow where the check would be. */
function ActionRow({
  title,
  detail,
  trailing,
  onPress,
}: {
  title: string;
  detail: string;
  trailing: IconName;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.choice,
        { backgroundColor: theme.surface, borderColor: 'transparent', opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.flex}>
        <ThemedText type="headline">{title}</ThemedText>
        <ThemedText type="footnote" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>
      <Icon name={trailing} size={16} tintColor={theme.textTertiary} />
    </Pressable>
  );
}

// Opacity would flatten the Liquid Glass buttons on the page, so steps move by transform alone.
const SLIDE = { duration: 320, easing: Easing.out(Easing.cubic) };

function slideIn(direction: SharedValue<1 | -1>, width: number) {
  return () => {
    'worklet';
    return {
      initialValues: { transform: [{ translateX: direction.get() * width }] },
      animations: { transform: [{ translateX: withTiming(0, SLIDE) }] },
    };
  };
}

function slideOut(direction: SharedValue<1 | -1>, width: number) {
  return () => {
    'worklet';
    return {
      initialValues: { transform: [{ translateX: 0 }] },
      animations: { transform: [{ translateX: withTiming(-direction.get() * width, SLIDE) }] },
    };
  };
}

function LegalLink({ title, url }: { title: string; url: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => void attempt('onboarding', openLegalDocument(url))}
      style={styles.textButton}
    >
      <ThemedText type="footnote" themeColor="textSecondary">
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 500, overflow: 'hidden' },
  flex: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    minHeight: 78,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  textButton: { minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  commitment: { alignItems: 'center', gap: 20, paddingBottom: 8 },
  promise: { gap: 16 },
  bleed: { marginHorizontal: -Spacing.three },
  swatch: { width: 22, height: 22, borderRadius: 11 },
  error: { position: 'absolute', top: 100, left: 24, right: 24, borderRadius: 16, padding: 16 },
});
