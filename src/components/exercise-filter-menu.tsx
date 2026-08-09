import { Host, Image, Menu, Picker, Section, Text, ZStack } from '@expo/ui/swift-ui';
import { buttonStyle, contentShape, frame, shapes, tag } from '@expo/ui/swift-ui/modifiers';
import { View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useTheme } from '@/hooks/use-theme';
import { ANY, titleCase, type FacetMenu } from '@/lib/exercise-filters';

/** Tag no row carries, so a Picker holding none of the selection shows no
 *  checkmark. A Picker with an unmatched selection is fine; one sharing the
 *  real selection would draw a second checkmark alongside the submenu's. */
const UNSELECTED = '';

type Props = {
  /** Section heading inside the menu, e.g. "Muscle". */
  title: string;
  /** Label of the row that clears this facet, e.g. "Any muscle". */
  anyLabel: string;
  systemName: SFSymbol;
  menu: FacetMenu;
  value: string;
  onChange: (value: string) => void;
  /** Icon colour when this facet is unset. SwiftUI would otherwise use its
   *  default accent (blue), which reads as permanently "on". */
  restingTint: string;
  /** Fires when the menu is about to open and again once it has closed, so the
   *  screen can put a scrim up for as long as it's on screen. */
  onOpenChange: (open: boolean) => void;
  /** Side of the square tap target, in points. Should match the capsule this
   *  sits in — the whole capsule is the button, not just the glyph. */
  size: number;
};

/**
 * Native UIMenu over a single filter facet, the same control Photos and Files
 * use for filtering. A Picker inside a menu renders as checkmarked rows, so the
 * current selection is visible without opening anything.
 *
 * One facet per menu: with two capsules flanking the search field, the glyph is
 * the only thing telling them apart, so a menu that offered both facets would
 * make the two buttons interchangeable.
 *
 * SwiftUI's `Menu` reports nothing about its presentation — there is no
 * open/close event on the native view — so the open state is inferred here:
 * a touch on the trigger opens it, and it can only close by the user picking a
 * row (which fires `onChange`) or tapping away (which the screen's scrim
 * catches). That tap-away is the whole reason the state is tracked at all: the
 * menu's own dismissal doesn't consume the tap, so without a scrim it lands on
 * whatever list row is underneath and pushes a detail screen.
 */
export function ExerciseFacetMenu({
  title,
  anyLabel,
  systemName,
  menu,
  value,
  onChange,
  restingTint,
  onOpenChange,
  size,
}: Props) {
  const theme = useTheme();

  const select = (next: string) => {
    // Every menu row dismisses the menu as it fires, so each change is also a
    // close.
    onOpenChange(false);
    onChange(next);
  };

  return (
    // `onTouchStart` rather than a Pressable: anything that could claim the
    // touch would stop it reaching the SwiftUI trigger and the menu would never
    // open. The capture-free touch hook only observes.
    <View onTouchStart={() => onOpenChange(true)} style={{ width: size, height: size }}>
      {/* Sized rather than `matchContents`: the host has to cover the whole
          capsule, otherwise it shrinks to the glyph and everything outside the
          icon's ~20pt box is dead space. */}
      <Host style={{ width: size, height: size }}>
        <Menu
          // `buttonStyle` propagates through the environment to the button the
          // Menu builds internally, which is what draws the grey disc behind
          // the glyph on press-and-hold. Press feedback here is the glass
          // capsule's own (`isInteractive`), so the disc is pure duplication.
          modifiers={[buttonStyle('plain')]}
          label={
            /*
              A Menu's tap target is exactly its label — `frame` on the Menu
              itself grows the layout slot but leaves the button the size of the
              glyph, which is why the surrounding circle wasn't tappable. The
              expansion has to happen inside the label, and `contentShape` is
              what makes the now-empty padding hit-test at all.
            */
            <ZStack
              modifiers={[
                frame({ width: size, height: size }),
                contentShape(shapes.rectangle()),
              ]}>
              <Image systemName={systemName} color={value !== ANY ? theme.accent : restingTint} />
            </ZStack>
          }>
          <Section title={title}>
            <Picker
              label={title}
              selection={value === ANY || menu.options.includes(value) ? value : UNSELECTED}
              onSelectionChange={(next) => select(String(next))}>
              <Text modifiers={[tag(ANY)]}>{anyLabel}</Text>
              {menu.options.map((option) => (
                <Text key={option} modifiers={[tag(option)]}>
                  {titleCase(option)}
                </Text>
              ))}
            </Picker>
            {menu.groups?.map((group) => (
              <Menu key={group.title} label={group.title}>
                <Picker
                  label={group.title}
                  selection={group.options.includes(value) ? value : UNSELECTED}
                  onSelectionChange={(next) => select(String(next))}>
                  {group.options.map((option) => (
                    <Text key={option} modifiers={[tag(option)]}>
                      {titleCase(option)}
                    </Text>
                  ))}
                </Picker>
              </Menu>
            ))}
          </Section>
        </Menu>
      </Host>
    </View>
  );
}
