import { useState } from 'react';
import { Pressable } from 'react-native';

import { Menu, type MenuItem } from '@/components/android/menu';
import { Icon, type IconName } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { ANY, titleCase, type FacetMenu } from '@/lib/exercise-filters';

type Props = {
  /** Section heading inside the menu, e.g. "Muscle". */
  title: string;
  /** Label of the row that clears this facet, e.g. "Any muscle". */
  anyLabel: string;
  systemName: IconName;
  menu: FacetMenu;
  value: string;
  onChange: (value: string) => void;
  /** Icon colour when this facet is unset. */
  restingTint: string;
  /** Fires when the menu opens and again once it has closed. */
  onOpenChange: (open: boolean) => void;
  /** Side of the square tap target, in points. */
  size: number;
};

/**
 * The platform's dropdown menu rather than a UIMenu. Unlike SwiftUI's it says
 * when it closes, so `onOpenChange` is driven rather than inferred — the search
 * bar collapses its filter capsules off that flag.
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
  const [open, setOpen] = useState(false);

  const present = (next: boolean) => {
    setOpen(next);
    onOpenChange(next);
  };

  const items: MenuItem[] = [
    { key: ANY, label: anyLabel, selected: value === ANY, onPress: () => onChange(ANY) },
    ...menu.options.map((option) => ({
      key: option,
      label: titleCase(option),
      selected: value === option,
      onPress: () => onChange(option),
    })),
    ...(menu.groups ?? []).map((group) => ({
      key: group.title,
      label: group.title,
      selected: group.options.includes(value),
      items: group.options.map((option) => ({
        key: option,
        label: titleCase(option),
        selected: value === option,
        onPress: () => onChange(option),
      })),
    })),
  ];

  return (
    <Menu
      open={open}
      title={title}
      items={items}
      onClose={() => present(false)}
      style={{ width: size, height: size }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={() => present(true)}
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={systemName} size={22} tintColor={value !== ANY ? theme.accent : restingTint} />
      </Pressable>
    </Menu>
  );
}
