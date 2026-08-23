import { SupersetColors } from '@/constants/superset-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useSupersetColor(index: number): string {
  const palette = SupersetColors[useColorScheme()];
  return palette[index % palette.length];
}
