import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { BadgeRow, type BadgeFace } from '@/components/achievements/badge-canvas';
import { Spacing } from '@/constants/theme';
import type { EarnedBadge } from '@/lib/achievements';
import { struckMaterial } from '@/lib/badge-material';

const MAX_COLUMNS = 4;
const MAX_SIZE = 72;
const GAP = Spacing.three;
/** `BadgeRow` draws its contact shadow below the disc — see its `BLEED`. */
const BLEED = 0.25;

/**
 * The badges a finished session earned, as ornament: no captions and no
 * pressables, because the recap is not the place to inspect one. The count
 * above it says what they are.
 */
export function EarnedBadges({ badges }: { badges: readonly EarnedBadge[] }) {
  const { width } = useWindowDimensions();

  if (badges.length === 0) return null;

  const columns = Math.min(MAX_COLUMNS, badges.length);
  const available = width - Spacing.three * 2;
  const size = Math.min(MAX_SIZE, Math.floor((available - GAP * (columns - 1)) / columns));

  const rows: BadgeFace[][] = [];
  for (let i = 0; i < badges.length; i += columns) {
    rows.push(
      badges.slice(i, i + columns).map((badge) => ({
        numeral: badge.tier.numeral,
        material: struckMaterial(badge.tier.id, badge.tier.material),
      }))
    );
  }

  return (
    <View style={styles.rows}>
      {rows.map((faces, index) => (
        <View
          key={index}
          style={{
            width: size * faces.length + GAP * (faces.length - 1),
            height: size * (1 + BLEED),
          }}>
          <BadgeRow faces={faces} size={size} gap={GAP} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: {
    alignItems: 'center',
    gap: Spacing.one,
  },
});
