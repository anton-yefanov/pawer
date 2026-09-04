import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CircleButton } from '@/components/circle-button';
import { BigButton } from '@/components/workout/big-button';
import type { AchievementTier } from '@/constants/achievement-tiers';
import { Spacing } from '@/constants/theme';
import * as haptics from '@/lib/haptics';
import type { BadgeMaterial } from '@/lib/badge-material';
import { notice } from '@/lib/notice';
import { report } from '@/lib/observability';
import { saveAchievement, shareAchievement, writeShareCard } from '@/lib/share-achievement';
import { drawShareCard, type ShareCard } from '@/lib/share-card';
import type { ShareCardAssets } from '@/lib/share-card-assets';
import { track } from '@/lib/telemetry';

const SAVED_FOR = 1600;

type Props = {
  /** Loaded by the spotlight rather than here, so the fonts are already in
   *  memory by the time a badge is lifted. */
  assets: ShareCardAssets | null;
  tier: AchievementTier;
  exercise: string;
  requirement: string;
  detail: string;
  material: BadgeMaterial;
};

/**
 * The way a badge leaves the app: a card to the share sheet, or straight into
 * Photos. Both draw the same 1080x1920 still and then throw the file away — it
 * is a courier for a URL, not something the app keeps.
 */
export function ShareBadgeButton({
  assets,
  tier,
  exercise,
  requirement,
  detail,
  material,
}: Props) {
  const [busy, setBusy] = useState(false);
  // iOS shows nothing of its own for a write to the library, so the disc says
  // it landed: the glyph becomes a tick and goes back on its own.
  const [saved, setSaved] = useState(false);
  const revert = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(revert.current), []);
  const disabled = assets == null || busy;

  async function run(deliver: (uri: string) => Promise<boolean>, action: 'share' | 'save') {
    if (assets == null || busy) return;
    setBusy(true);
    try {
      const card: ShareCard = {
        numeral: tier.numeral,
        tier: tier.name,
        exercise,
        requirement,
        detail,
        material,
      };
      let uri: string;
      try {
        uri = writeShareCard(drawShareCard(card, assets.fonts, assets.logo));
      } catch (error) {
        report('achievements', error);
        notice({ title: "Couldn't make the image", message: String(error) });
        return;
      }

      if (!(await deliver(uri))) return;
      track('achievement_shared', { tier: tier.id, action });

      if (action === 'save') {
        haptics.complete();
        setSaved(true);
        clearTimeout(revert.current);
        revert.current = setTimeout(() => setSaved(false), SAVED_FOR);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.row}>
      <View style={styles.share}>
        <BigButton
          title="Share"
          symbol="square.and.arrow.up"
          disabled={disabled}
          onPress={() => void run(shareAchievement, 'share')}
        />
      </View>
      <CircleButton
        symbol={saved ? 'checkmark' : 'arrow.down.to.line'}
        label="Save to Photos"
        disabled={disabled}
        feedback="press"
        onPress={() => void run(saveAchievement, 'save')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  share: {
    minWidth: 160,
  },
});
