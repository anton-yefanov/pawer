import { Pressable, StyleSheet, View } from 'react-native';

import { CardCover } from '@/components/templates/card-cover';
import { ThemedText } from '@/components/themed-text';
import { type CardColor } from '@/constants/card-colors';
import { CardRaised, Spacing } from '@/constants/theme';
import { FOLDER_CORNER, FOLDER_ICON_ASPECT, FOLDER_PANEL_TOP } from '@/lib/folder-icons';
import * as haptics from '@/lib/haptics';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** The shell shared by template and folder cards. */
export function GridCard({
  cover,
  color,
  title,
  onPress,
  width,
  showCover = true,
  menu,
  liftable = false,
}: {
  cover: React.ReactNode;
  color: CardColor | null;
  title: string;
  onPress: () => void;
  width: number;
  /** Off when the artwork is the whole card, as a folder's is. */
  showCover?: boolean;
  /** Pinned to the cover's top-right corner, outside the card's own press target. */
  menu?: React.ReactNode;
  /** Set when a long press lifts the card for dragging. */
  liftable?: boolean;
}) {
  return (
    <View style={{ width }}>
      <Pressable
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        // A long press is a drag lift, and RN skips onPress once onLongPress has
        // fired, so releasing a dragged card over itself doesn't open it.
        onLongPress={liftable ? () => {} : undefined}
        delayLongPress={LIFT_DELAY}
        style={({ pressed }) => [pressed && styles.pressed]}>
        <CardArt cover={cover} color={color} width={width} showCover={showCover} />
        <View style={styles.body}>
          <ThemedText type="footnote" weight="semibold" numberOfLines={1}>
            {title}
          </ThemedText>
        </View>
      </Pressable>
      {menu && <View style={[styles.menu, menuOffset(width)]}>{menu}</View>}
    </View>
  );
}

/**
 * Everything above the title: a template's cover or a folder's illustration, in
 * the box both kinds share. A shared link's card images are snapshots of this.
 */
export function CardArt({
  cover,
  color,
  width,
  showCover = true,
}: {
  cover: React.ReactNode;
  color: CardColor | null;
  width: number;
  showCover?: boolean;
}) {
  const raised = CardRaised[useColorScheme()];

  return (
    <View style={[styles.slot, { height: coverBoxHeight(width) }]}>
      {showCover ? (
        <View style={[styles.cover, coverStyle(width), raised]}>
          <CardCover color={color} />
          {cover}
        </View>
      ) : (
        cover
      )}
    </View>
  );
}

/** Long enough that a tap opens the card and a scroll flick doesn't lift it. */
export const LIFT_DELAY = 250;

/**
 * Every card slot reserves its drop-highlight border up front, transparent
 * until a folder is receiving. Adding the border only while receiving would
 * shrink the fixed-width content box by 4pt and shift the card mid-drag.
 */
export const CARD_BORDER = 2;

/** The drop-highlight ring, which follows the slot rather than the cover. */
const SLOT_RADIUS = 16;

export const cardSlot = {
  borderWidth: CARD_BORDER,
  borderColor: 'transparent',
  borderRadius: SLOT_RADIUS,
} as const;

const LABEL_LINE = 20;
/**
 * A cover is the folder's panel: the same width, the same depth and the same
 * baseline, with only the tab's wing rising above it. It is what a cover photo
 * is cropped to, and what a folder's own artwork is laid out against.
 */
export const COVER_ASPECT = FOLDER_ICON_ASPECT / (1 - FOLDER_PANEL_TOP);
/**
 * Both kinds of card are drawn this much narrower than their slot, which is
 * what makes a template cover exactly as wide as a folder icon.
 */
export const COVER_SCALE = 0.82;
const BODY_HEIGHT = Spacing.one + LABEL_LINE;

/** A template cover's size for a given card width. */
export function coverSize(cardWidth: number): { width: number; height: number } {
  const width = cardWidth * COVER_SCALE;
  return { width, height: width / COVER_ASPECT };
}

/** The corner a cover of this width shares with a folder's bottom corners. */
export function coverRadius(coverWidth: number): number {
  return coverWidth * FOLDER_CORNER;
}

function coverStyle(cardWidth: number) {
  const size = coverSize(cardWidth);
  return { ...size, borderRadius: coverRadius(size.width) };
}

/** The box both kinds sit in, sized by the folder icon — the deeper of the two. */
export function coverBoxHeight(cardWidth: number): number {
  return (cardWidth * COVER_SCALE) / FOLDER_ICON_ASPECT;
}

const MENU_INSET = Spacing.one;

/**
 * A template cover and a folder's back panel share one rectangle — the same
 * width, and a top edge at the panel's line — so one corner serves both kinds.
 */
function menuOffset(cardWidth: number) {
  const box = coverBoxHeight(cardWidth);
  return {
    top: box * FOLDER_PANEL_TOP + MENU_INSET,
    right: (cardWidth * (1 - COVER_SCALE)) / 2 + MENU_INSET,
  };
}

/** Height of a whole slot, border included, for a given slot width. */
export function slotHeight(width: number): number {
  const card = width - CARD_BORDER * 2;
  return coverBoxHeight(card) + BODY_HEIGHT + CARD_BORDER * 2;
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  // Bottom-aligned rather than centred: a cover and a folder's panel share a
  // baseline, and only the tab's wing rises above it.
  slot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cover: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  menu: {
    position: 'absolute',
  },
  body: {
    paddingTop: Spacing.one,
    alignItems: 'center',
  },
});
