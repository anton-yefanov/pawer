import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { type ReactElement, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SHEET_BOTTOM_INSET, SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';
import { attempt } from '@/lib/observability';

const COLUMNS = 3;
const PAGE = 60;

type Photo = { id: string };

/**
 * The device's photos, inline in the customize sheet rather than behind the
 * system picker: choosing a cover is a browsing job, and a modal over a sheet
 * loses the preview the user is choosing against.
 *
 * It owns the whole sheet body below the header, list included, because a grid
 * this long has to be the sheet's one scrollable — a `FlatList` nested in a
 * `ScrollView` inside a form sheet scrolls neither.
 */
export function MediaGrid({
  header,
  busyId,
  onPick,
}: {
  header: ReactElement;
  busyId: string | null;
  onPick: (id: string) => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  // Photos only, matching the manifest the config plugin writes — asking for a
  // permission that isn't declared fails outright on Android 13+.
  const [permission, requestPermission] = MediaLibrary.usePermissions({
    granularPermissions: ['photo'],
  });
  const [photos, setPhotos] = useState<readonly Photo[]>([]);
  const [exhausted, setExhausted] = useState(false);

  const granted = permission?.granted ?? false;

  // A failed query used to leave an empty grid, which reads exactly like an
  // empty photo library.
  const load = useCallback(async (offset: number) => {
    const page = await new MediaLibrary.Query()
      .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.IMAGE)
      .orderBy({ key: MediaLibrary.AssetField.CREATION_TIME, ascending: false })
      .offset(offset)
      .limit(PAGE)
      // Ids alone, and no file paths resolved: an `id` is already the `ph://`
      // uri a thumbnail draws from, and the manipulator reads one directly.
      .exeForMetadata();

    setExhausted(page.length < PAGE);
    setPhotos((current) => {
      const next = page.map((asset) => ({ id: asset.id }));
      return offset === 0 ? next : [...current, ...next];
    });
  }, []);

  useEffect(() => {
    if (!granted) return;
    // Limited access is changed from a system modal that never reports back —
    // the library's own change event is the only signal that it happened.
    const subscription = MediaLibrary.addListener(() => void attempt('media', load(0)));
    // Off the effect's own tick: the first page is a subscription that has
    // already missed its event, not state this render is supposed to settle.
    const first = setTimeout(() => void attempt('media', load(0)));
    return () => {
      clearTimeout(first);
      subscription.remove();
    };
  }, [granted, load]);

  if (!granted) {
    const askable = permission === null || permission.canAskAgain;
    return (
      <ScrollView {...SHEET_SCROLL} contentContainerStyle={styles.gate}>
        {header}
        <View style={styles.gateBody}>
          <ThemedText type="footnote" themeColor="textSecondary" style={styles.gateText}>
            {askable
              ? 'Allow access to your photos to use one as this template’s cover.'
              : 'Photo access is off for pawer. Turn it on in Settings to use a photo as this template’s cover.'}
          </ThemedText>
          <Pressable
            onPress={() => {
              haptics.press();
              void attempt('media', askable ? requestPermission() : Linking.openSettings());
            }}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.gateButton,
              { backgroundColor: theme.accent },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="headline" themeColor="accentContent">
              {askable ? 'Allow access' : 'Open Settings'}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const cell = width / COLUMNS;

  return (
    <FlatList
      {...SHEET_SCROLL}
      data={photos}
      keyExtractor={(photo) => photo.id}
      numColumns={COLUMNS}
      ListHeaderComponent={header}
      ListFooterComponent={
        permission?.accessPrivileges === 'limited' ? <ManageAccess /> : null
      }
      contentContainerStyle={styles.grid}
      onEndReachedThreshold={1}
      onEndReached={() => {
        if (!exhausted) void attempt('media', load(photos.length));
      }}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => {
            haptics.select();
            onPick(item.id);
          }}
          disabled={busyId !== null}
          accessibilityRole="button"
          accessibilityLabel="Use photo as cover"
          style={({ pressed }) => [
            { width: cell, height: cell },
            pressed && styles.pressed,
          ]}>
          <Image
            source={{ uri: item.id }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            recyclingKey={item.id}
          />
          {busyId === item.id && (
            <View style={[StyleSheet.absoluteFill, styles.busy, { backgroundColor: theme.scrim }]}>
              <ActivityIndicator color={theme.accentContent} />
            </View>
          )}
        </Pressable>
      )}
    />
  );
}

/** iOS 14+ limited access: the app can only ever see what this modal selects. */
function ManageAccess() {
  return (
    <Pressable
      onPress={() => {
        haptics.press();
        void attempt('media', MediaLibrary.presentPermissionsPicker());
      }}
      accessibilityRole="button"
      style={({ pressed }) => [styles.manage, pressed && styles.pressed]}>
      <ThemedText themeColor="accent">Manage photos…</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingBottom: SHEET_BOTTOM_INSET,
  },
  gate: {
    paddingBottom: SHEET_BOTTOM_INSET,
  },
  gateBody: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  gateText: {
    textAlign: 'center',
  },
  gateButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
  },
  manage: {
    alignSelf: 'center',
    paddingVertical: Spacing.three,
  },
  busy: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
