import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { CIRCLE_BUTTON_SIZE } from '@/components/circle-button';
import { SheetGrabber } from '@/components/sheet-grabber';
import { ArtworkLayer } from '@/components/templates/artwork-layer';
import { type ArtworkMode, ArtworkTabs } from '@/components/templates/artwork-tabs';
import { CardCover } from '@/components/templates/card-cover';
import { ColorPicker } from '@/components/templates/color-picker';
import { EmojiPicker } from '@/components/templates/emoji-picker';
import { EmojiSlots } from '@/components/templates/emoji-slots';
import { COVER_RATIO } from '@/components/templates/grid-card';
import { MediaGrid } from '@/components/templates/media-grid';
import { ThemedText } from '@/components/themed-text';
import { CloseButton, HeaderPillButton } from '@/components/workout/workout-sheet-header';
import { asCardColor, type CardColor } from '@/constants/card-colors';
import { SHEET_BOTTOM_INSET, SHEET_SCROLL, SHEET_TOP_INSET } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import {
  asCardArtwork,
  type CardArtwork,
  emojiArtwork,
  EXERCISES_ARTWORK,
  MAX_EMOJI,
  photoArtwork,
} from '@/lib/card-artwork';
import { deleteCoverPhoto, importCoverPhoto } from '@/lib/card-photos';
import { setFolderColor } from '@/lib/folder-actions';
import { setTemplateAppearance } from '@/lib/template-actions';
import { folderQuery, templateExercisesQuery, templateQuery } from '@/lib/template-queries';

export default function CustomizeScreen() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind: 'template' | 'folder' }>();
  const isFolder = kind === 'folder';
  const { width } = useWindowDimensions();

  // Both queries run unconditionally — `kind` is fixed for a mounted sheet, and
  // one extra single-row read is cheaper than a conditional hook.
  const { data: templateRows } = useLiveQuery(templateQuery(id), [id]);
  const { data: folderRows } = useLiveQuery(folderQuery(id), [id]);
  const { data: exerciseRows } = useLiveQuery(templateExercisesQuery(id), [id]);
  const row = isFolder ? folderRows?.[0] : templateRows?.[0];

  // `undefined` is "untouched, use the row" — an empty array is a real value,
  // the cleared cover, so it can't stand in for it. The draft is what Save
  // writes; nothing else does.
  const [pickedColor, setPickedColor] = useState<CardColor | undefined>(undefined);
  const [pickedEmojis, setPickedEmojis] = useState<readonly string[] | undefined>(undefined);
  const [pickedPhoto, setPickedPhoto] = useState<string | null | undefined>(undefined);
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);
  const [pickedMode, setPickedMode] = useState<ArtworkMode | undefined>(undefined);
  const [importing, setImporting] = useState<string | null>(null);

  // Every file this sheet wrote. Save keeps the committed one and drops the
  // rest; Close drops them all — an import is only a cover once it is saved.
  const imported = useRef<string[]>([]);

  const saved = asCardArtwork(templateRows?.[0]?.artwork);
  const color = pickedColor ?? asCardColor(row?.color);
  const mode = pickedMode ?? modeOf(saved);
  const emojis = pickedEmojis ?? (saved?.kind === 'emoji' ? saved.emojis : EMPTY);
  const photo = pickedPhoto ?? (saved?.kind === 'photo' ? saved.file : null);
  const sourceIds = exerciseRows?.map((exercise) => exercise.sourceId) ?? EMPTY_IDS;

  if (isFolder) {
    const select = (next: CardColor) => {
      void setFolderColor(id, next);
      router.back();
    };
    return (
      <View style={styles.folder}>
        <SheetGrabber />
        <ColorPicker selected={color} onSelect={select} />
      </View>
    );
  }

  const coverWidth = width - Spacing.three * 2;
  // The selected tab is the cover's source; the other tabs' drafts sit untouched
  // behind it, so a look at Media and back doesn't cost the user their emoji.
  const artwork: CardArtwork | null =
    mode === 'exercises'
      ? EXERCISES_ARTWORK
      : mode === 'media'
        ? photoArtwork(photo)
        : emojiArtwork(emojis);

  const place = (slot: number, emoji: string) =>
    setPickedEmojis(
      slot < emojis.length
        ? emojis.map((current, index) => (index === slot ? emoji : current))
        : [...emojis, emoji].slice(0, MAX_EMOJI),
    );

  const pickPhoto = async (assetId: string) => {
    setImporting(assetId);
    try {
      const file = await importCoverPhoto(assetId);
      imported.current.push(file);
      setPickedPhoto(file);
    } finally {
      setImporting(null);
    }
  };

  const discard = (keep: string | null) => {
    for (const file of imported.current) if (file !== keep) deleteCoverPhoto(file);
    imported.current = [];
  };

  const save = () => {
    discard(artwork?.kind === 'photo' ? photo : null);
    void setTemplateAppearance(id, color, artwork);
    router.back();
  };

  const close = () => {
    discard(null);
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

  const clear = (
    <Pressable
      onPress={() => {
        if (mode === 'media') setPickedPhoto(null);
        else setPickedEmojis(EMPTY);
      }}
      disabled={!artwork}
      accessibilityRole="button"
      style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
      <ThemedText themeColor={artwork ? 'accent' : 'textSecondary'}>Clear</ThemedText>
    </Pressable>
  );

  const header = (
    <>
      <View style={styles.preview}>
        <View style={styles.cover}>
          <CardCover color={color} />
          <ArtworkLayer
            artwork={artwork}
            coverHeight={coverWidth * COVER_RATIO}
            exerciseSourceIds={sourceIds}
          />
        </View>
      </View>
      <View style={styles.colors}>
        <ColorPicker selected={color} onSelect={setPickedColor} />
      </View>
      <ArtworkTabs mode={mode} onChange={setPickedMode} />
      {/* Under the pills in media mode, where the slot row's own Clear would
          otherwise sit below a full screen of photos. */}
      {mode === 'media' && clear}
    </>
  );

  return (
    <>
      <Stack.Screen options={{ sheetAllowedDetents: [1] }} />
      <SheetGrabber />
      {mode === 'media' ? (
        <MediaGrid header={header} busyId={importing} onPick={(assetId) => void pickPhoto(assetId)} />
      ) : (
        <ScrollView {...SHEET_SCROLL} contentContainerStyle={styles.content}>
          {header}
          {mode === 'exercises' ? (
            sourceIds.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                Exercises previews will be shown on template cover when you add them
              </ThemedText>
            )
          ) : (
            <>
              <EmojiSlots
                emojis={emojis}
                onPick={setPickingSlot}
                onRemove={(slot) => setPickedEmojis(emojis.filter((_, index) => index !== slot))}
              />
              {clear}
            </>
          )}
        </ScrollView>
      )}
      {/* Where Close and Finish sit on the workout sheet. This sheet draws no
          nav bar, so the buttons are placed rather than handed to one. */}
      <View style={styles.close}>
        <CloseButton onPress={close} />
      </View>
      <View style={styles.save}>
        <HeaderPillButton title="Save" onPress={save} />
      </View>
    </>
  );
}

function modeOf(artwork: CardArtwork | null): ArtworkMode {
  if (artwork?.kind === 'exercises') return 'exercises';
  return artwork?.kind === 'photo' ? 'media' : 'emoji';
}

/** Stable identity, so an untouched sheet doesn't rebuild its artwork each render. */
const EMPTY: readonly string[] = [];
const EMPTY_IDS: readonly (string | null)[] = [];

const styles = StyleSheet.create({
  content: {
    paddingBottom: SHEET_BOTTOM_INSET + Spacing.two,
  },
  // A `fitToContents` sheet floats clear of the home indicator, so the colour
  // row is centred on its own padding rather than a safe-area inset.
  folder: {
    paddingVertical: Spacing.four,
  },
  // Clears the Save pill, so the preview sits evenly between the button and
  // the colour row.
  preview: {
    paddingTop: SHEET_TOP_INSET + CIRCLE_BUTTON_SIZE + Spacing.four,
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
  hint: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
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
