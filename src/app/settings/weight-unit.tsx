import { router } from 'expo-router';

import { PickerSheet } from '@/components/settings/picker-sheet';
import { WEIGHT_UNITS, useWeightUnitPreference } from '@/lib/weight-unit';

export default function WeightUnitSettingsScreen() {
  const { unit, setUnit } = useWeightUnitPreference();

  return (
    <PickerSheet
      title="Weight Unit"
      options={WEIGHT_UNITS}
      selected={unit}
      onSelect={(id) => {
        void setUnit(id);
        router.back();
      }}
    />
  );
}
