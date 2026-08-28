import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Pressable } from '@/components/pressable';
import { ThemedText } from '@/components/themed-text';
import { BigButton, BIG_BUTTON_HEIGHT } from '@/components/workout/big-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';
import { ensureNotificationPermission } from '@/lib/notifications';
import { useOnboarding } from '@/lib/onboarding';
import type { WeightUnit } from '@/lib/units';
import { useWeightUnitPreference } from '@/lib/weight-unit';

import { Step } from './step';

const UNITS: { id: WeightUnit; label: string; system: string }[] = [
  { id: 'kg', label: 'kg', system: 'Metric' },
  { id: 'lb', label: 'lb', system: 'Imperial' },
];

export function Onboarding() {
  const { done } = useOnboarding();

  return done ? null : <OnboardingFlow />;
}

function OnboardingFlow() {
  const theme = useTheme();
  const { complete } = useOnboarding();
  const { setUnit } = useWeightUnitPreference();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<WeightUnit | null>(null);
  const { width } = useWindowDimensions();
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.set(withTiming(-step * width, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, [offset, step, width]);

  const track = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  const next = () => setStep((current) => current + 1);
  const back = () => setStep((current) => current - 1);

  return (
    <View style={[styles.overlay, { backgroundColor: theme.surface }]}>
      <Animated.View style={[styles.track, track]}>
        <View style={{ width }}>
          <Step
            index={0}
            title="Welcome to Pawer"
            body={[
              'The interface is pretty intuitive, but if you need help finding certain features, please refer to Guidebook in Settings.',
              'If you have any questions, suggestions or found a bug, please use Contact form in Settings, we will try responding as quickly as possible.',
            ]}>
            <BigButton title="Get Started" onPress={next} />
            <View style={styles.secondSlot}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
                Everything you log stays on this phone
              </ThemedText>
            </View>
          </Step>
        </View>

        <View style={{ width }}>
          <Step
            index={1}
            onBack={back}
            title="Units"
            body="Pick how weights are shown. You can change this any time in Settings."
            choices={
              <View style={styles.units}>
                {UNITS.map((unit) => (
                  <UnitCard
                    key={unit.id}
                    label={unit.label}
                    system={unit.system}
                    selected={unit.id === picked}
                    onPress={() => {
                      haptics.tap();
                      setPicked(unit.id);
                    }}
                  />
                ))}
              </View>
            }>
            <BigButton
              title="Continue"
              disabled={picked === null}
              onPress={() => {
                if (picked) void setUnit(picked);
                next();
              }}
            />
            <View style={styles.secondSlot} />
          </Step>
        </View>

        <View style={{ width }}>
          <Step
            index={2}
            onBack={back}
            title="Know when rest is over"
            body="Pawer can send a notification the moment your rest timer ends, so you can put your phone down between sets.">
            <View style={styles.actions}>
              <BigButton
                title="Allow Notifications"
                onPress={() => {
                  void ensureNotificationPermission().finally(() => void complete());
                }}
              />
              <BigButton title="Not Now" variant="tinted" onPress={() => void complete()} />
            </View>
          </Step>
        </View>
      </Animated.View>
    </View>
  );
}

function UnitCard({
  label,
  system,
  selected,
  onPress,
}: {
  label: string;
  system: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${system}`}
      style={({ pressed }) => [
        styles.unit,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: selected ? theme.accent : 'transparent',
          opacity: pressed ? 0.6 : 1,
        },
      ]}>
      <ThemedText type="subtitle">{label}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {system}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 500, overflow: 'hidden' },
  track: { position: 'absolute', top: 0, bottom: 0, left: 0, flexDirection: 'row' },
  actions: { gap: Spacing.two },
  secondSlot: { height: BIG_BUTTON_HEIGHT, justifyContent: 'center' },
  note: { textAlign: 'center' },
  units: { flexDirection: 'row', gap: Spacing.three },
  unit: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2,
    paddingVertical: Spacing.four,
    alignItems: 'center',
    gap: Spacing.half,
  },
});
