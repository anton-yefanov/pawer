import { Button, Host, Image, Menu, ZStack } from '@expo/ui/swift-ui';
import { buttonStyle, contentShape, frame, shapes } from '@expo/ui/swift-ui/modifiers';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { CIRCLE_BUTTON_SIZE, GlassCircle } from '@/components/circle-button';
import { promptNewFolder } from '@/components/templates/card-actions';
import { useTheme } from '@/hooks/use-theme';
import { allowNewTemplate } from '@/lib/pro-gates';
import { usePro } from '@/lib/purchases';
import { guard } from '@/lib/observability';

/** Same Host-sizing rules as CardMenu — see the comment there. */
export function AddMenu() {
  const theme = useTheme();
  const isPro = usePro();

  const newTemplate = async () => {
    if (await guard('pro-gates', allowNewTemplate(isPro))) router.push('/template/new');
  };

  return (
    <GlassCircle accessibilityLabel="Add">
      <Host style={styles.addHost} ignoreSafeArea="all">
        <Menu
          modifiers={[buttonStyle('plain')]}
          label={
            <ZStack
              modifiers={[
                frame({ width: CIRCLE_BUTTON_SIZE, height: CIRCLE_BUTTON_SIZE }),
                contentShape(shapes.rectangle()),
              ]}>
              <Image systemName="plus" color={theme.text} />
            </ZStack>
          }>
          <Button
            label="New Template"
            systemImage="doc.badge.plus"
            onPress={() => void newTemplate()}
          />
          <Button label="New Folder" systemImage="folder.badge.plus" onPress={promptNewFolder} />
        </Menu>
      </Host>
    </GlassCircle>
  );
}

const styles = StyleSheet.create({
  addHost: {
    width: CIRCLE_BUTTON_SIZE,
    height: CIRCLE_BUTTON_SIZE,
  },
});
