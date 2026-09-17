import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { BadgeRow, type BadgeFace } from '@/components/achievements/badge-canvas';
import { Spacing } from '@/constants/theme';
import type { EarnedBadge } from '@/lib/achievements';
import { struckMaterial } from '@/lib/badge-material';

const PER_ROW = 5;
const MAX_SIZE = 72;
/** How much of a badge its right-hand neighbour covers. */
const OVERLAP = 0.34;
const ROW_OVERLAP = 0.28;
/** `BadgeRow` draws its contact shadow below the disc — see its `BLEED`. */
const BLEED = 0.25;

/**
 * The badges a finished session earned, as ornament: no captions and no
 * pressables, because the recap is not the place to inspect one. The count
 * above it says what they are.
 *
 * They pile rather than tile. `BadgeRow` places badge n at `n * (size + gap)`,
 * so a negative gap is the whole fan — the Skia layer needs to know nothing
 * about it, and painter order puts each badge over the one to its left. Rows
 * are laid out `column-reverse` for the same reason in the other axis: the last
 * chunk ends up highest *and* drawn last, so an overflow row sits on top of the
 * one it spilled from.
 */
export function EarnedBadges({ badges }: { badges: readonly EarnedBadge[] }) {
  const { width } = useWindowDimensions();

  if (badges.length === 0) return null;

  const columns = Math.min(PER_ROW, badges.length);
  const available = width - Spacing.three * 2;
  const span = 1 + (columns - 1) * (1 - OVERLAP);
  const size = Math.min(MAX_SIZE, Math.floor(available / span));
  const gap = -size * OVERLAP;

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
            width: size * faces.length + gap * (faces.length - 1),
            height: size * (1 + BLEED),
            marginBottom: index === 0 ? 0 : -size * ROW_OVERLAP,
          }}>
          <BadgeRow faces={faces} size={size} gap={gap} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: {
    flexDirection: 'column-reverse',
    alignItems: 'center',
  },
});
