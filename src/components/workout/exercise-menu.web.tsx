import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 180, 300] as const;

/** No SwiftUI menu on web — the button degrades to the destructive action. */
export function ExerciseMenu({ onRemove }: { onRemove: () => void } & Record<string, unknown>) {
  const theme = useTheme();
  return (
    <Pressable onPress={onRemove} accessibilityLabel="Remove exercise" hitSlop={8}>
      <SymbolView name="ellipsis" size={20} tintColor={theme.textSecondary} />
    </Pressable>
  );
}
