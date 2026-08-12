import { asCardColor, CardGradients, type CardColor } from '@/constants/card-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * The radial cover fill for a card color. `backgroundColor` is not redundant:
 * react-native-web ignores `experimental_backgroundImage`, so the edge color is
 * what web renders.
 */
export function useCardGradient(color: CardColor | string | null | undefined) {
  const { center, edge } = CardGradients[useColorScheme()][asCardColor(color)];

  return {
    backgroundColor: edge,
    experimental_backgroundImage: `radial-gradient(circle at 50% 30%, ${center} 0%, ${edge} 100%)`,
  } as const;
}
