import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Emoji } from '@/components/emoji';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { EMOJI, EMOJI_SECTIONS, type EmojiEntry } from '@/constants/emoji-data';
import { SHEET_BOTTOM_INSET, SHEET_SCROLL, SHEET_TOP_INSET } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

const MIN_CELL = 52;
const GLYPH = 32;
const FIELD_HEIGHT = 36;
const STRIP_HEIGHT = 32;
const HEADER_HEIGHT = SHEET_TOP_INSET + FIELD_HEIGHT + Spacing.two + STRIP_HEIGHT;

/**
 * The emoji grid. It is a *step* of the customize sheet, not a route of its own:
 * a picker route would have to hand a value back, and every other sheet in the
 * app writes to the database instead of returning.
 *
 * Laid out the way the exercise library is — the list fills the sheet and the
 * chrome floats over it, clearing itself with content padding. A form sheet
 * hands touches to the scrollable it finds and the chrome around it; an
 * `absoluteFill` pane beside the scrollable draws correctly and then receives
 * no touches at all.
 */
export function EmojiPicker({
  onPick,
  onCancel,
}: {
  onPick: (emoji: string) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const list = useRef<FlatList<EmojiEntry>>(null);

  const columns = Math.max(6, Math.floor((width - Spacing.three * 2) / MIN_CELL));
  const cell = (width - Spacing.three * 2) / columns;

  const search = query.trim().toLowerCase();
  const shown = useMemo(
    // Prefix-matched per word, so "run" finds "running shoe" but not "hamburger".
    () => (search ? EMOJI.filter((entry) => ` ${entry[1]}`.includes(` ${search}`)) : EMOJI),
    [search],
  );

  // By offset, not index: `scrollToIndex` range-checks against the rows the list
  // has realised, and every jump past the first screen is outside that range.
  const jump = (start: number) => {
    haptics.select();
    setQuery('');
    list.current?.scrollToOffset({
      offset: Math.floor(start / columns) * cell,
      animated: false,
    });
  };

  return (
    <>
      <FlatList
        {...SHEET_SCROLL}
        ref={list}
        data={shown}
        keyExtractor={(entry) => entry[0]}
        numColumns={columns}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              haptics.select();
              onPick(item[0]);
            }}
            accessibilityRole="button"
            accessibilityLabel={item[1].split(' ')[0]}
            style={({ pressed }) => [
              styles.cell,
              { width: cell, height: cell },
              pressed && styles.pressed,
            ]}>
            <Emoji value={item[0]} size={GLYPH} />
          </Pressable>
        )}
      />

      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.search}>
          <View style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
            <Icon name="magnifyingglass" size={16} tintColor={theme.textSecondary} />
            <ThemedTextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              returnKeyType="search"
              style={styles.input}
            />
          </View>
          <Pressable onPress={onCancel} accessibilityRole="button" hitSlop={Spacing.two}>
            <ThemedText themeColor="accent">Cancel</ThemedText>
          </Pressable>
        </View>

        {/* Always mounted, so the header never changes height under the list.
            Jumping clears the search, which is the only way an offset into the
            unfiltered array can mean anything. */}
        <View style={styles.categories}>
          {EMOJI_SECTIONS.map((section) => (
            <Pressable
              key={section.category}
              onPress={() => jump(section.start)}
              accessibilityRole="button"
              accessibilityLabel={section.category}
              style={({ pressed }) => [styles.category, pressed && styles.pressed]}>
              <Emoji value={section.icon} size={20} />
            </Pressable>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    paddingTop: SHEET_TOP_INSET,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    height: FIELD_HEIGHT,
    paddingHorizontal: Spacing.two,
    borderRadius: 10,
  },
  input: {
    flex: 1,
  },
  categories: {
    flexDirection: 'row',
    height: STRIP_HEIGHT,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  category: {
    flex: 1,
    alignItems: 'center',
  },
  grid: {
    paddingTop: HEADER_HEIGHT,
    paddingHorizontal: Spacing.three,
    paddingBottom: SHEET_BOTTOM_INSET,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.5,
  },
});
