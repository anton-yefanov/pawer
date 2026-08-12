import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import {
  Card,
  DisclosureRow,
  SectionFooter,
  SectionTitle,
  Separator,
} from '@/components/grouped-list';
import { ToggleRow } from '@/components/settings/toggle-row';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAutofillWeightPreference } from '@/lib/autofill-weight';
import { FINISH_REMINDER_OPTIONS, useFinishReminder } from '@/lib/finish-reminder';
import { THEME_PREFERENCES, useThemePreference } from '@/lib/theme-preference';
import { useWeightUnit } from '@/lib/weight-unit';

export default function SettingsScreen() {
  const theme = useTheme();
  const { preference } = useThemePreference();
  const unit = useWeightUnit();
  const { enabled: autofillWeight, setEnabled: setAutofillWeight } = useAutofillWeightPreference();
  const { option: finishReminder } = useFinishReminder();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <SectionTitle>Appearance</SectionTitle>
      <Card>
        <DisclosureRow
          label="Dark Theme"
          value={THEME_PREFERENCES.find((option) => option.id === preference)?.short}
          chevron={false}
          onPress={() => router.push('/settings/theme')}
        />
      </Card>

      <SectionTitle>Workout</SectionTitle>
      <Card>
        <DisclosureRow
          label="Weight Unit"
          value={unit}
          chevron={false}
          onPress={() => router.push('/settings/weight-unit')}
        />
        <Separator />
        <ToggleRow label="Autofill Weight" value={autofillWeight} onChange={setAutofillWeight} />
      </Card>
      <SectionFooter>
        When entering reps, the weight is filled in from your previous set if it&apos;s empty.
      </SectionFooter>

      <SectionTitle>Reminders</SectionTitle>
      <Card>
        <DisclosureRow
          label="Finish Reminder"
          value={FINISH_REMINDER_OPTIONS.find((option) => option.id === finishReminder)?.short}
          chevron={false}
          onPress={() => router.push('/settings/finish-reminder')}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
});
