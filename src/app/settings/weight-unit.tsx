import { router } from 'expo-router';

import { PickerSheet } from '@/components/settings/picker-sheet';
import { WEIGHT_UNITS, useWeightUnitPreference } from '@/lib/weight-unit';
import { attempt } from '@/lib/observability';

export default function WeightUnitSettingsScreen() {
  const { unit, setUnit } = useWeightUnitPreference();

  return (
    <PickerSheet
      title="Weight Unit"
      options={WEIGHT_UNITS}
      selected={unit}
      onSelect={(id) => {
        void attempt('settings', setUnit(id), { title: 'Couldn’t save setting', message: 'Please try again.' });
        router.back();
      }}
    />
  );
}
