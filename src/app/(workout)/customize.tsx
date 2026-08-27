import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { CIRCLE_BUTTON_SIZE } from '@/components/circle-button';
import { SheetGrabber } from '@/components/sheet-grabber';
import { ArtworkLayer } from '@/components/templates/artwork-layer';
import { CardCover } from '@/components/templates/card-cover';
import { ColorPicker } from '@/components/templates/color-picker';
import { EmojiPicker } from '@/components/templates/emoji-picker';
import { EmojiSlots } from '@/components/templates/emoji-slots';
import { COVER_RATIO } from '@/components/templates/grid-card';
import { ThemedText } from '@/components/themed-text';
import { CloseButton, HeaderPillButton } from '@/components/workout/workout-sheet-header';
import { asCardColor, type CardColor } from '@/constants/card-colors';
import { SHEET_BOTTOM_INSET, SHEET_SCROLL, SHEET_TOP_INSET } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { asCardArtwork, emojiArtwork, MAX_EMOJI } from '@/lib/card-artwork';
import { setFolderColor } from '@/lib/folder-actions';
import { setTemplateAppearance } from '@/lib/template-actions';
import { folderQuery, templateQuery } from '@/lib/template-queries';

export default function CustomizeScreen() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind: 'template' | 'folder' }>();
  const isFolder = kind === 'folder';
  const { width } = useWindowDimensions();

  // Both queries run unconditionally — `kind` is fixed for a mounted sheet, and
  // one extra single-row read is cheaper than a conditional hook.
  const { data: templateRows } = useLiveQuery(templateQuery(id), [id]);
  const { data: folderRows } = useLiveQuery(folderQuery(id), [id]);
  const row = isFolder ? folderRows?.[0] : templateRows?.[0];

  // `undefined` is "untouched, use the row" — an empty array is a real value,
  // the cleared cover, so it can't stand in for it. The draft is what Save
  // writes; nothing else does.
  const [pickedColor, setPickedColor] = useState<CardColor | undefined>(undefined);
  const [pickedEmojis, setPickedEmojis] = useState<readonly string[] | undefined>(undefined);
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);

  const color = pickedColor ?? asCardColor(row?.color);
  const emojis =
    pickedEmojis ?? asCardArtwork(templateRows?.[0]?.artwork)?.emojis ?? EMPTY;

  if (isFolder) {
    const select = (next: CardColor) => {
      void setFolderColor(id, next);
      router.back();
    };
    return (
      <View style={styles.content}>
        <SheetGrabber />
        <ColorPicker selected={color} onSelect={select} />
      </View>
    );
  }

  const coverWidth = width - Spacing.three * 2;

  const place = (slot: number, emoji: string) =>
    setPickedEmojis(
      slot < emojis.length
        ? emojis.map((current, index) => (index === slot ? emoji : current))
        : [...emojis, emoji].slice(0, MAX_EMOJI),
    );

  const save = () => {
    void setTemplateAppearance(id, color, emojiArtwork(emojis));
    router.back();
  };

  // The picker replaces the sheet's body rather than covering it — see the
  // comment on `EmojiPicker`. The draft lives up here, so it survives the swap.
  if (pickingSlot !== null) {
    return (
      <>
        <Stack.Screen options={{ sheetAllowedDetents: [1] }} />
        <EmojiPicker
          onPick={(emoji) => {
            place(pickingSlot, emoji);
            setPickingSlot(null);
          }}
          onCancel={() => setPickingSlot(null)}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ sheetAllowedDetents: [1] }} />
      <SheetGrabber />
      <ScrollView {...SHEET_SCROLL} contentContainerStyle={styles.content}>
        <View style={styles.preview}>
          <View style={styles.cover}>
            <CardCover color={color} />
            <ArtworkLayer
              artwork={emojiArtwork(emojis)}
              coverHeight={coverWidth * COVER_RATIO}
            />
          </View>
        </View>
        <View style={styles.colors}>
          <ColorPicker selected={color} onSelect={setPickedColor} />
        </View>
        <EmojiSlots
          emojis={emojis}
          onPick={setPickingSlot}
          onRemove={(slot) => setPickedEmojis(emojis.filter((_, index) => index !== slot))}
        />
        <Pressable
          onPress={() => setPickedEmojis(EMPTY)}
          disabled={emojis.length === 0}
          accessibilityRole="button"
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
          <ThemedText themeColor={emojis.length === 0 ? 'textSecondary' : 'accent'}>
            Clear
          </ThemedText>
        </Pressable>
      </ScrollView>
      {/* Where Close and Finish sit on the workout sheet. This sheet draws no
          nav bar, so the buttons are placed rather than handed to one. */}
      <View style={styles.close}>
        <CloseButton onPress={() => router.back()} />
      </View>
      <View style={styles.save}>
        <HeaderPillButton title="Save" onPress={save} />
      </View>
    </>
  );
}

/** Stable identity, so an untouched sheet doesn't rebuild its artwork each render. */
const EMPTY: readonly string[] = [];

const styles = StyleSheet.create({
  content: {
    paddingTop: SHEET_TOP_INSET,
    paddingBottom: SHEET_BOTTOM_INSET + Spacing.two,
  },
  // Clears the Save pill, so the preview sits evenly between the button and
  // the colour row.
  preview: {
    paddingTop: CIRCLE_BUTTON_SIZE + Spacing.four,
  },
  // The card's cover alone — same proportions and corner as a real card, with
  // the name and exercise list left off. As wide as the cards below it.
  cover: {
    marginHorizontal: Spacing.three,
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  colors: {
    paddingVertical: Spacing.three,
  },
  clear: {
    alignSelf: 'center',
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  close: {
    position: 'absolute',
    top: SHEET_TOP_INSET,
    left: Spacing.three,
  },
  save: {
    position: 'absolute',
    top: SHEET_TOP_INSET,
    right: Spacing.three,
  },
});
