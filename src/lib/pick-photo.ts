import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

/**
 * One photo out of the system picker. Null when the user cancels, or leaves
 * access off.
 *
 * The permission is asked for explicitly even though `PHPickerViewController`
 * does not need one: the picker is reached by tapping the empty thumbnail, and
 * a system sheet appearing with no prompt first reads as the app having helped
 * itself to the library.
 */
export async function pickPhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    if (!permission.canAskAgain) {
      Alert.alert(
        'Photo access is off',
        'Turn on photo access for pawer in Settings to use one of your photos here.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ]
      );
    }
    return null;
  }

  // Never `quality: 1`: at exactly 1 the picker skips re-encoding and hands back
  // the asset's raw bytes — HDR HEIC under a `.jpg` name — and the manipulator
  // cannot encode the extended-range image that renders into. Anything below it
  // returns a plain sRGB JPEG, which is re-compressed on import anyway.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 0.9,
  });

  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}
