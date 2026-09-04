import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { CIRCLE_BUTTON_SIZE, CircleButton } from '@/components/circle-button';
import { SheetGrabber } from '@/components/sheet-grabber';
import { SheetOverlay } from '@/components/sheet-overlay';
import { ArtworkLayer } from '@/components/templates/artwork-layer';
import { type ArtworkMode, ArtworkTabs } from '@/components/templates/artwork-tabs';
import { CardCover } from '@/components/templates/card-cover';
import { ColorPicker } from '@/components/templates/color-picker';
import { EmojiPicker } from '@/components/templates/emoji-picker';
import { EmojiSlots } from '@/components/templates/emoji-slots';
import { FolderArt } from '@/components/templates/folder-art';
import { COVER_ASPECT, coverRadius } from '@/components/templates/grid-card';
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
  hidesCardColor,
  MAX_EMOJI,
  photoArtwork,
} from '@/lib/card-artwork';
import { deleteCoverPhoto, importCoverPhoto } from '@/lib/card-photos';
import { type ExerciseArt } from '@/lib/exercise-media';
import { FOLDER_ICON_ASPECT } from '@/lib/folder-icons';
import { setFolderAppearance } from '@/lib/folder-actions';
import { setTemplateAppearance } from '@/lib/template-actions';
import { folderQuery, templateExercisesQuery, templateQuery } from '@/lib/template-queries';

import { notice } from '@/lib/notice';
import { attempt, report } from '@/lib/observability';

const SAVE_FAILED = {
  title: 'Couldn’t save',
  message: 'That change wasn’t saved. Please try again.',
};

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

  const saved = asCardArtwork(row?.artwork);
  const color = pickedColor ?? asCardColor(row?.color);
  // A folder wears emoji or nothing, so it never leaves the one mode and the
  // photo machinery below stays inert for it.
  const mode = isFolder ? 'emoji' : (pickedMode ?? modeOf(saved));
  const emojis = pickedEmojis ?? (saved?.kind === 'emoji' ? saved.emojis : EMPTY);
  const photo = pickedPhoto ?? (saved?.kind === 'photo' ? saved.file : null);
  const exerciseArt =
    exerciseRows?.map(({ sourceId, imageFile }) => ({ sourceId, imageFile })) ?? EMPTY_ART;

  const coverWidth = width - Spacing.three * 2;
  // The preview folder is drawn narrower than a cover, and takes back the
  // height it loses as padding, so both kinds of preview are the same block.
  const folderWidth = coverWidth * FOLDER_PREVIEW_SCALE;
  const folderPad = (coverWidth - folderWidth) / FOLDER_ICON_ASPECT / 2;
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
    } catch (error) {
      // A `ph://` asset that hasn't come down from iCloud, a corrupt HEIC, a
      // full disk. The spinner used to stop and nothing else happened.
      report('photos', error, { phase: 'import-cover' });
      notice({
        title: 'Couldn’t use that photo',
        message: 'Please pick a different one.',
      });
    } finally {
      setImporting(null);
    }
  };

  const discard = (keep: string | null) => {
    for (const file of imported.current) if (file !== keep) deleteCoverPhoto(file);
    imported.current = [];
  };

  // The write lands before the unused imports go: discarding first meant a
  // failed write left the sheet closing as though it had saved, with the photo
  // it kept referenced by nothing.
  const save = async () => {
    const write = isFolder
      ? attempt('folders', setFolderAppearance(id, color, artwork), SAVE_FAILED)
      : attempt('templates', setTemplateAppearance(id, color, artwork), SAVE_FAILED);
    if (!(await write)) return;
    discard(artwork?.kind === 'photo' ? photo : null);
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
      <EmojiPicker
        onPick={(emoji) => {
          place(pickingSlot, emoji);
          setPickingSlot(null);
        }}
        onCancel={() => setPickingSlot(null)}
      />
    );
  }

  // Where a custom exercise's thumbnail carries its own trash button: on the
  // artwork it clears, not under the tabs.
  const clear = mode !== 'exercises' && artwork && (
    <View
      style={[
        styles.clear,
        isFolder && {
          right: (coverWidth - folderWidth) / 2 + Spacing.two,
          bottom: folderPad + Spacing.two,
        },
      ]}>
      <CircleButton
        symbol="trash"
        symbolSize={18}
        size={CLEAR_BUTTON_SIZE}
        label="Clear artwork"
        feedback="press"
        onPress={() => {
          if (mode === 'media') setPickedPhoto(null);
          else setPickedEmojis(EMPTY);
        }}
      />
    </View>
  );

  const header = (
    <>
      <View style={styles.preview}>
        {isFolder ? (
          <View style={[styles.folder, { paddingVertical: folderPad }]}>
            <FolderArt color={color} artwork={artwork} width={folderWidth} />
          </View>
        ) : (
          <View style={[styles.cover, { borderRadius: coverRadius(coverWidth) }]}>
            <CardCover color={color} />
            <ArtworkLayer
              artwork={artwork}
              coverHeight={coverWidth / COVER_ASPECT}
              exerciseArt={exerciseArt}
            />
          </View>
        )}
        {clear}
      </View>
      <View style={styles.colors}>
        <ColorPicker
          selected={color}
          onSelect={setPickedColor}
          disabled={hidesCardColor(artwork)}
        />
      </View>
      {!isFolder && <ArtworkTabs mode={mode} onChange={setPickedMode} />}
    </>
  );

  return (
    <>
      <SheetGrabber />
      {mode === 'media' ? (
        <MediaGrid header={header} busyId={importing} onPick={(assetId) => void pickPhoto(assetId)} />
      ) : (
        <ScrollView {...SHEET_SCROLL} contentContainerStyle={styles.content}>
          {header}
          {mode === 'exercises' ? (
            exerciseArt.length === 0 && (
              <ThemedText type="footnote" themeColor="textTertiary" style={styles.hint}>
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
            </>
          )}
        </ScrollView>
      )}
      {/* Where Close and Finish sit on the workout sheet. This sheet draws no
          nav bar, so the buttons are placed rather than handed to one. */}
      <SheetOverlay>
        <View style={styles.close}>
          <CloseButton onPress={close} />
        </View>
        <View style={styles.save}>
          <HeaderPillButton title="Save" onPress={() => void save()} />
        </View>
      </SheetOverlay>
    </>
  );
}

function modeOf(artwork: CardArtwork | null): ArtworkMode {
  if (artwork?.kind === 'exercises') return 'exercises';
  return artwork?.kind === 'photo' ? 'media' : 'emoji';
}

/** How much narrower than a template cover the preview folder is drawn. */
const FOLDER_PREVIEW_SCALE = 0.78;

const CLEAR_BUTTON_SIZE = 40;

/** Stable identity, so an untouched sheet doesn't rebuild its artwork each render. */
const EMPTY: readonly string[] = [];
const EMPTY_ART: readonly ExerciseArt[] = [];

const styles = StyleSheet.create({
  content: {
    paddingBottom: SHEET_BOTTOM_INSET + Spacing.two,
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
    aspectRatio: COVER_ASPECT,
    overflow: 'hidden',
  },
  folder: {
    alignItems: 'center',
  },
  colors: {
    paddingVertical: Spacing.three,
  },
  clear: {
    position: 'absolute',
    right: Spacing.three + Spacing.two,
    bottom: Spacing.two,
  },
  hint: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
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
