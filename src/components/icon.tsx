import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { Icon as PhosphorIcon, IconWeight } from 'phosphor-react-native';
import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { ArrowDownRightIcon } from 'phosphor-react-native/src/icons/ArrowDownRight';
import { ArrowSquareOutIcon } from 'phosphor-react-native/src/icons/ArrowSquareOut';
import { ArrowUpRightIcon } from 'phosphor-react-native/src/icons/ArrowUpRight';
import { ArrowsClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowsClockwise';
import { BarbellIcon } from 'phosphor-react-native/src/icons/Barbell';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { ChartBarIcon } from 'phosphor-react-native/src/icons/ChartBar';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { CopyIcon } from 'phosphor-react-native/src/icons/Copy';
import { DotsSixVerticalIcon } from 'phosphor-react-native/src/icons/DotsSixVertical';
import { DotsThreeIcon } from 'phosphor-react-native/src/icons/DotsThree';
import { DownloadSimpleIcon } from 'phosphor-react-native/src/icons/DownloadSimple';
import { FilePlusIcon } from 'phosphor-react-native/src/icons/FilePlus';
import { FolderIcon } from 'phosphor-react-native/src/icons/Folder';
import { FolderMinusIcon } from 'phosphor-react-native/src/icons/FolderMinus';
import { FolderPlusIcon } from 'phosphor-react-native/src/icons/FolderPlus';
import { GearIcon } from 'phosphor-react-native/src/icons/Gear';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MinusIcon } from 'phosphor-react-native/src/icons/Minus';
import { NoteBlankIcon } from 'phosphor-react-native/src/icons/NoteBlank';
import { NotePencilIcon } from 'phosphor-react-native/src/icons/NotePencil';
import { PaletteIcon } from 'phosphor-react-native/src/icons/Palette';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { PersonArmsSpreadIcon } from 'phosphor-react-native/src/icons/PersonArmsSpread';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { PlusCircleIcon } from 'phosphor-react-native/src/icons/PlusCircle';
import { SlidersHorizontalIcon } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import { TimerIcon } from 'phosphor-react-native/src/icons/Timer';
import { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
import { TrophyIcon } from 'phosphor-react-native/src/icons/Trophy';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { Platform } from 'react-native';

type SymbolMapping = Extract<SymbolViewProps['name'], object>;

type IconEntry = {
  /** SF Symbol on iOS; the Material Symbol is what `SymbolView` draws on web. */
  symbol: SymbolMapping;
  /**
   * Every Phosphor icon is imported from its own module rather than the
   * package root: the barrel re-exports ~1500 of them and Metro does not
   * tree-shake, so one root import would bundle the entire set.
   */
  glyph: PhosphorIcon;
  weight?: IconWeight;
};

/**
 * The one place a glyph is named. Keys are SF-style because iOS is the
 * reference platform, but each entry carries all three renderings — Android
 * draws Phosphor, whose rounded terminals sit with the mascot art and the
 * bundled Nunito face rather than against them.
 */
const ICONS = {
  'arrow.down.right': {
    symbol: { ios: 'arrow.down.right', android: 'south_east' },
    glyph: ArrowDownRightIcon,
  },
  'arrow.clockwise': {
    symbol: { ios: 'arrow.clockwise', android: 'refresh' },
    glyph: ArrowClockwiseIcon,
  },
  'arrow.triangle.2.circlepath': {
    symbol: { ios: 'arrow.triangle.2.circlepath', android: 'sync' },
    glyph: ArrowsClockwiseIcon,
  },
  'arrow.up.right': {
    symbol: { ios: 'arrow.up.right', android: 'north_east' },
    glyph: ArrowUpRightIcon,
  },
  'arrow.up.right.square': {
    symbol: { ios: 'arrow.up.right.square', android: 'open_in_new', web: 'link' },
    glyph: ArrowSquareOutIcon,
  },
  checkmark: { symbol: { ios: 'checkmark', android: 'check' }, glyph: CheckIcon },
  'chart.bar': { symbol: { ios: 'chart.bar', android: 'bar_chart' }, glyph: ChartBarIcon },
  'chart.bar.fill': {
    symbol: { ios: 'chart.bar.fill', android: 'bar_chart' },
    glyph: ChartBarIcon,
    weight: 'fill',
  },
  'chevron.left': { symbol: { ios: 'chevron.left', android: 'chevron_left' }, glyph: CaretLeftIcon },
  'chevron.right': {
    symbol: { ios: 'chevron.right', android: 'chevron_right' },
    glyph: CaretRightIcon,
  },
  clock: { symbol: { ios: 'clock', android: 'access_time' }, glyph: ClockIcon },
  'clock.fill': {
    symbol: { ios: 'clock.fill', android: 'access_time_filled' },
    glyph: ClockIcon,
    weight: 'fill',
  },
  'doc.badge.plus': { symbol: { ios: 'doc.badge.plus', android: 'note_add' }, glyph: FilePlusIcon },
  dumbbell: { symbol: { ios: 'dumbbell', android: 'fitness_center' }, glyph: BarbellIcon },
  'dumbbell.fill': {
    symbol: { ios: 'dumbbell.fill', android: 'fitness_center' },
    glyph: BarbellIcon,
    weight: 'fill',
  },
  ellipsis: { symbol: { ios: 'ellipsis', android: 'more_horiz' }, glyph: DotsThreeIcon },
  'figure.strengthtraining.traditional': {
    symbol: { ios: 'figure.strengthtraining.traditional', android: 'exercise' },
    // Phosphor has no weightlifting figure. This one labels the muscle facet,
    // sitting beside the equipment facet's barbell, so a plain body reads it.
    glyph: PersonArmsSpreadIcon,
  },
  'folder.badge.minus': {
    symbol: { ios: 'folder.badge.minus', android: 'folder_off' },
    glyph: FolderMinusIcon,
  },
  'folder.badge.plus': {
    symbol: { ios: 'folder.badge.plus', android: 'create_new_folder' },
    glyph: FolderPlusIcon,
  },
  'folder.fill': {
    symbol: { ios: 'folder.fill', android: 'folder' },
    glyph: FolderIcon,
    weight: 'fill',
  },
  gearshape: { symbol: { ios: 'gearshape', android: 'settings' }, glyph: GearIcon },
  'gearshape.fill': {
    symbol: { ios: 'gearshape.fill', android: 'settings' },
    glyph: GearIcon,
    weight: 'fill',
  },
  house: { symbol: { ios: 'house', android: 'home' }, glyph: HouseIcon },
  'house.fill': {
    symbol: { ios: 'house.fill', android: 'home_filled' },
    glyph: HouseIcon,
    weight: 'fill',
  },
  info: { symbol: { ios: 'info', android: 'info' }, glyph: InfoIcon },
  'line.3.horizontal': {
    symbol: { ios: 'line.3.horizontal', android: 'drag_handle' },
    glyph: DotsSixVerticalIcon,
  },
  magnifyingglass: {
    symbol: { ios: 'magnifyingglass', android: 'search' },
    glyph: MagnifyingGlassIcon,
  },
  minus: { symbol: { ios: 'minus', android: 'remove' }, glyph: MinusIcon },
  'note.text': { symbol: { ios: 'note.text', android: 'notes' }, glyph: NotePencilIcon },
  paintpalette: { symbol: { ios: 'paintpalette', android: 'palette' }, glyph: PaletteIcon },
  pencil: { symbol: { ios: 'pencil', android: 'edit' }, glyph: PencilSimpleIcon },
  plus: { symbol: { ios: 'plus', android: 'add' }, glyph: PlusIcon },
  'plus.circle': { symbol: { ios: 'plus.circle', android: 'add_circle' }, glyph: PlusCircleIcon },
  'plus.square.on.square': {
    symbol: { ios: 'plus.square.on.square', android: 'content_copy' },
    glyph: CopyIcon,
  },
  'slider.horizontal.3': {
    symbol: { ios: 'slider.horizontal.3', android: 'tune' },
    glyph: SlidersHorizontalIcon,
  },
  'square.and.arrow.down': {
    symbol: { ios: 'square.and.arrow.down', android: 'download' },
    glyph: DownloadSimpleIcon,
  },
  'text.badge.minus': {
    symbol: { ios: 'text.badge.minus', android: 'speaker_notes_off' },
    glyph: NoteBlankIcon,
  },
  timer: { symbol: { ios: 'timer', android: 'timer' }, glyph: TimerIcon },
  trash: { symbol: { ios: 'trash', android: 'delete' }, glyph: TrashIcon },
  'trophy.fill': {
    symbol: { ios: 'trophy.fill', android: 'trophy' },
    glyph: TrophyIcon,
    weight: 'fill',
  },
  xmark: { symbol: { ios: 'xmark', android: 'close' }, glyph: XIcon },
} as const satisfies Record<string, IconEntry>;

export type IconName = keyof typeof ICONS;

type Props = Pick<SymbolViewProps, 'size' | 'tintColor' | 'resizeMode' | 'style'> & {
  name: IconName;
};

export function Icon({ name, ...props }: Props) {
  const entry: IconEntry = ICONS[name];

  if (Platform.OS === 'android') {
    const Glyph = entry.glyph;
    // `resizeMode` is a `SymbolView` fit hint; Phosphor draws to `size` exactly.
    return (
      <Glyph
        size={props.size ?? 24}
        color={props.tintColor as string}
        weight={entry.weight ?? 'regular'}
        style={props.style}
      />
    );
  }

  return <SymbolView name={entry.symbol} {...props} />;
}

/**
 * `NativeTabs.Trigger.Icon` takes the two platforms as separate props rather
 * than a mapping object, so the pair is spread in from here.
 */
export function tabIcon(defaultName: IconName, selectedName: IconName) {
  return {
    sf: { default: ICONS[defaultName].symbol.ios, selected: ICONS[selectedName].symbol.ios },
    md: { default: ICONS[defaultName].symbol.android, selected: ICONS[selectedName].symbol.android },
  };
}

/** The SwiftUI hosts take a bare SF name on `systemImage`, not a mapping. */
export function sfSymbol(name: IconName) {
  return ICONS[name].symbol.ios;
}
