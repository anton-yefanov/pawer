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
import Animated, {
  Easing,
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
import { Spacing } from '@/constants/theme';
import { TINT_OPTIONS } from '@/constants/tints';
import { useTheme } from '@/hooks/use-theme';
import { db } from '@/db/client';
import { getSetting } from '@/db/seed';
import * as haptics from '@/lib/haptics';
import { openLegalDocument, PRIVACY_POLICY_URL } from '@/lib/legal';
import { ensureNotificationPermission } from '@/lib/notifications';
import { BODY_SEXES, useBodySexPreference } from '@/lib/body-sex';
import { attempt, report } from '@/lib/observability';
import { useOnboarding } from '@/lib/onboarding';
import { buildPersonalPlan, isPlanAnswers, type PlanAnswers } from '@/lib/personal-plan';
import { usePro } from '@/lib/purchases';
import { PERSONAL_PLAN_KEY, savePersonalPlan } from '@/lib/save-personal-plan';
import { track } from '@/lib/telemetry';
import { useThemePreference } from '@/lib/theme-preference';
import { WEIGHT_UNITS, useWeightUnitPreference } from '@/lib/weight-unit';

import { AnatomyPreview } from './appearance';
import { ImportSourceChoices } from './import-source-choices';
import { PaywallPage } from './paywall-page';
import { ChoiceArt, Step, StepHeader } from './step';

const SAVE_FAILED = {
  title: 'Couldn’t save that',
  message: 'Your choice wasn’t saved. Please try again.',
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
type StepName =
  | 'welcome'
  | 'history'
  | 'import'
  | 'goal'
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
        detail: 'Make every rep count.',
        icon: 'dumbbell.fill',
      },
      {
        id: 'strength',
        title: 'Get stronger',
        detail: 'Build confidence under the weight.',
        icon: 'bolt.fill',
      },
      {
        id: 'consistency',
        title: 'Build a lasting habit',
        detail: 'A routine you’ll want to come back to.',
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
        detail: 'Simple movements. A manageable start.',
        icon: 'hand.wave.fill',
      },
      {
        id: 'returning',
        title: 'I have some experience',
        detail: 'I know the basics or I’m coming back.',
        icon: 'arrow.clockwise',
      },
      {
        id: 'experienced',
        title: 'I train regularly',
        detail: 'Ready for a more demanding routine.',
        icon: 'dumbbell.fill',
      },
    ],
  },
  equipment: {
    icon: 'dumbbell.fill',
    title: 'Your training setup.',
    choices: [
      {
        id: 'gym',
        title: 'A fully equipped gym',
        detail: 'Machines, cables and free weights.',
        icon: 'dumbbell.fill',
      },
      {
        id: 'dumbbells',
        title: 'Dumbbells and a bench',
        detail: 'A pair of weights. Plenty of possibilities.',
        icon: 'house.fill',
      },
      {
        id: 'bodyweight',
        title: 'Just my bodyweight',
        detail: 'Floor space is all you need.',
        icon: 'figure.strengthtraining.traditional',
      },
    ],
  },
  days: {
    icon: 'calendar',
    title: 'Make room for your goals.',
    choices: [
      { id: 2, title: '2 days', detail: 'A steady start with room to recover.', icon: 'calendar' },
      { id: 3, title: '3 days', detail: 'A balanced rhythm for the week.', icon: 'calendar' },
      { id: 4, title: '4 days', detail: 'More time to make training your own.', icon: 'calendar' },
    ],
  },
  minutes: {
    icon: 'clock.fill',
    title: 'How much time is yours?',
    choices: [
      {
        id: 20,
        title: 'About 20 minutes',
        detail: 'The essentials. Make them count.',
        icon: 'bolt.fill',
      },
      {
        id: 35,
        title: 'About 35 minutes',
        detail: 'Room to focus on every movement.',
        icon: 'clock',
      },
      {
        id: 50,
        title: 'About 50 minutes',
        detail: 'More room for volume and recovery.',
        icon: 'dumbbell.fill',
      },
    ],
  },
} satisfies Record<
  keyof PlanAnswers,
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
  const [holding, setHolding] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [origin, setOrigin] = useState({ x: width / 2, y: height * 0.7 });
  const holdRef = useRef<View>(null);
  const progress = useSharedValue(0);
  const radius = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  // Read by the exiting page's worklet after the commit, so it can't come from props.
  const direction = useSharedValue<1 | -1>(1);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.get() * 0.2 }],
    opacity: 0.15 + progress.get() * 0.35,
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.get() }));
  const circleProps = useAnimatedProps(() => ({ r: reducedMotion ? 0 : radius.get() }));
  const revealStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? contentOpacity.get() : 1,
  }));
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
      savePersonalPlan(answers as PlanAnswers);
      router.navigate('/');
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
    setHolding(false);
    haptics.press();
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

  function startHold() {
    if (busyRef.current) return;
    holdRef.current?.measureInWindow((x, y, w, h) => setOrigin({ x: x + w / 2, y: y + h / 2 }));
    setHolding(true);
    haptics.tap();
    progress.set(withTiming(1, { duration: 900 }));
  }
  function releaseHold() {
    if (busyRef.current) return;
    setHolding(false);
    progress.set(withTiming(0, { duration: 160 }));
  }

  const common = {
    index,
    count: steps.length,
    onBack: index > 0 && !busy && step !== 'commit' && step !== 'paywall' ? back : undefined,
  };
  const questionKey = step in QUESTIONS ? (step as keyof PlanAnswers) : null;
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
  } else if (step === 'welcome') {
    page = (
      <Step
        eyebrow="YOUR NEXT CHAPTER"
        title={'Your next chapter\nstarts here.'}
        choices={
          <View style={[styles.preview, { backgroundColor: theme.surface }]}>
            <Icon name="folder.fill" size={42} tintColor={theme.accent} />
            <ThemedText type="title3">Your Personal Plan</ThemedText>
            <ThemedText type="subhead" themeColor="textSecondary">
              Your goal. Your schedule. Your starting point.
            </ThemedText>
            <View style={styles.feature}>
              <Icon name="checkmark" size={16} tintColor={theme.accent} />
              <ThemedText type="footnote">Ready-to-use workouts, made for you</ThemedText>
            </View>
          </View>
        }
      >
        <BigButton title="Build My Plan" onPress={() => go('history')} />
        <Footnote>Your workout data stays on your device.</Footnote>
        <Pressable
          accessibilityRole="link"
          onPress={() => void openLegalDocument(PRIVACY_POLICY_URL)}
          style={styles.textButton}
        >
          <ThemedText type="caption1" themeColor="textSecondary">
            Anonymous usage & diagnostics · Privacy Policy
          </ThemedText>
        </Pressable>
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
              detail="Bring your progress into Pawer."
              selected={usedApps === true}
              onPress={() => {
                haptics.select();
                setUsedApps(true);
              }}
            />
            <Choice
              title="No, I’m starting here"
              detail="Your first entry is waiting."
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
        title="Make Pawer feel like you."
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
        title="Know when rest is over."
        body="Pawer can send a notification the moment your rest timer ends, so you can put your phone down between sets."
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
    page = (
      <Step
        eyebrow="THIS IS YOUR STARTING LINE"
        title="Meet your personal plan."
        choices={
          <>
            <View style={[styles.preview, { backgroundColor: theme.surface }]}>
              <ThemedText type="title3">Your Personal Plan</ThemedText>
              {plan.workouts.map((workout, i) => (
                <View key={workout.name} style={styles.planRow}>
                  <View style={[styles.number, { backgroundColor: theme.accentTint }]}>
                    <ThemedText weight="bold" themeColor="accent">
                      {String.fromCharCode(65 + i)}
                    </ThemedText>
                  </View>
                  <View style={styles.flex}>
                    <ThemedText type="headline">{workout.name}</ThemedText>
                    <ThemedText type="footnote" themeColor="textSecondary">
                      {workout.exercises.length} exercises ·{' '}
                      {workout.exercises.reduce((sum, exercise) => sum + exercise.sets, 0)} working
                      sets · ~{workout.estimatedMinutes} min
                    </ThemedText>
                  </View>
                  <Icon name="checkmark" size={18} tintColor={theme.accent} />
                </View>
              ))}
            </View>
            <ThemedText type="footnote" themeColor="textSecondary">
              {plan.schedule}
            </ThemedText>
            <ThemedText type="footnote" themeColor="textSecondary">
              {plan.effort}
            </ThemedText>
          </>
        }
      >
        <BigButton
          title={busy ? 'Saving Your Plan…' : 'Make It Mine'}
          onPress={() => void preparePlan()}
          disabled={busy}
        />
        <Footnote>Your plan is included. No subscription required.</Footnote>
      </Step>
    );
  } else if (step === 'paywall') {
    page = isPro ? null : <PaywallPage onDone={() => go('commit')} />;
  } else {
    page = (
      <Step
        eyebrow="A PROMISE TO YOURSELF"
        title="Your goals deserve a first day."
        body="I’ll show up for myself, follow my dreams, and work toward my goals. One workout at a time."
        choices={
          <View style={styles.commitment}>
            <View ref={holdRef} collapsable={false}>
              <Animated.View
                pointerEvents="none"
                style={[styles.halo, { backgroundColor: theme.accent }, ringStyle]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Commit to my goals and open Pawer"
                accessibilityHint={
                  screenReader ? 'Double tap to confirm.' : 'Hold for one second to confirm.'
                }
                accessibilityActions={[{ name: 'activate', label: 'Confirm my commitment' }]}
                onAccessibilityAction={() => void finish()}
                disabled={busy}
                delayLongPress={900}
                onPressIn={startHold}
                onPressOut={releaseHold}
                onLongPress={() => void finish()}
                onPress={() => {
                  if (screenReader) void finish();
                }}
                style={[styles.holdButton, { backgroundColor: theme.accent }]}
              >
                <Icon name="hand.point.up.fill" size={48} tintColor={theme.accentContent} />
              </Pressable>
            </View>
            <ThemedText type="headline" themeColor="accent">
              {busy
                ? 'Welcome to your next chapter.'
                : holding
                  ? 'This is your moment…'
                  : screenReader
                    ? 'Double tap to begin'
                    : 'Touch and hold to begin'}
            </ThemedText>
            <Footnote>
              {holding
                ? 'Keep holding. You’re almost there.'
                : 'Your plan is ready. Your first workout is next.'}
            </Footnote>
          </View>
        }
      />
    );
  }

  return (
    <View
      accessibilityViewIsModal
      style={[
        styles.overlay,
        {
          display: importing ? 'none' : 'flex',
          backgroundColor: revealing ? 'transparent' : theme.background,
        },
      ]}
    >
      {revealing && (
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
            <Rect
              width={width}
              height={height}
              fill={theme.background}
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
  return (
    <Step
      eyebrow="KEEP YOUR MOMENTUM"
      title={state.file ? 'Here’s what we found.' : 'Your effort comes with you.'}
      choices={
        state.file ? (
          <View style={styles.bleed}>
            <ImportReview state={state} />
          </View>
        ) : (
          <ImportSourceChoices onChoose={() => void state.choose()} />
        )
      }
    >
      {state.file && state.workouts.length > 0 ? (
        <ImportButton state={state} />
      ) : (
        <BigButton title="Continue" onPress={onNext} />
      )}
      <BigButton title="Skip for Now" variant="tinted" onPress={onNext} />
    </Step>
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

function Footnote({ children }: { children: string }) {
  return (
    <ThemedText type="footnote" themeColor="textSecondary" style={styles.center}>
      {children}
    </ThemedText>
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
  preview: { padding: 24, borderRadius: 26, gap: 16 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  center: { textAlign: 'center' },
  textButton: { minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  number: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commitment: { alignItems: 'center', gap: 24, paddingVertical: 24 },
  holdButton: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: { position: 'absolute', width: 132, height: 132, borderRadius: 66, left: -10, top: -10 },
  bleed: { marginHorizontal: -Spacing.three },
  swatch: { width: 22, height: 22, borderRadius: 11 },
  error: { position: 'absolute', top: 100, left: 24, right: 24, borderRadius: 16, padding: 16 },
});
