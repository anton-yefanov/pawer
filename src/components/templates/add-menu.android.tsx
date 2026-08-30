import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Menu } from '@/components/android/menu';
import { CIRCLE_BUTTON_SIZE, GlassCircle } from '@/components/circle-button';
import { Icon } from '@/components/icon';
import { promptNewFolder } from '@/components/templates/card-actions';
import { useTheme } from '@/hooks/use-theme';
import { allowNewTemplate } from '@/lib/pro-gates';
import { usePro } from '@/lib/purchases';
import { guard } from '@/lib/observability';

export function AddMenu() {
  const theme = useTheme();
  const isPro = usePro();
  const [open, setOpen] = useState(false);

  const newTemplate = async () => {
    if (await guard('pro-gates', allowNewTemplate(isPro))) router.push('/template/new');
  };

  return (
    <GlassCircle accessibilityLabel="Add">
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        style={styles.trigger}
        items={[
          {
            key: 'template',
            label: 'New Template',
            onPress: () => void newTemplate(),
          },
          {
            key: 'folder',
            label: 'New Folder',
            onPress: promptNewFolder,
          },
        ]}>
        <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.trigger}>
          <Icon name="plus" size={22} tintColor={theme.text} />
        </Pressable>
      </Menu>
    </GlassCircle>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: CIRCLE_BUTTON_SIZE,
    height: CIRCLE_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
