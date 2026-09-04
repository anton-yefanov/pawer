import type { SkImage } from '@shopify/react-native-skia';
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

import { notice } from '@/lib/notice';
import { attempt, guard } from '@/lib/observability';

const FOLDER = 'share';
/** The share sheet and Files both show this, so it is written for a human. */
const FILENAME = 'Pawer Achievement.png';

/**
 * The card on disk, in the cache rather than the documents directory: it exists
 * only for as long as the share sheet or the Photos write needs a URL, and the
 * system is welcome to reap it. `photo-store.ts` is the same `Directory`/`File`
 * shape for the photos that are meant to survive.
 *
 * The folder is emptied on the way in rather than the file deleted on the way
 * out. `shareAsync` resolves when the sheet closes, but an extension it handed
 * the URL to may still be reading, and a card pulled out from under one is a
 * truncated image in whatever app the user just posted to. Keeping exactly the
 * last card costs one file.
 */
export function writeShareCard(image: SkImage): string {
  const directory = new Directory(Paths.cache, FOLDER);
  if (directory.exists) directory.delete();
  directory.create({ intermediates: true, idempotent: true });

  const file = new File(directory, FILENAME);
  file.create();
  file.write(image.encodeToBytes());
  return file.uri;
}

export async function shareAchievement(uri: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) {
    notice({
      title: 'Sharing unavailable',
      message: 'This device has no apps that can take an image.',
    });
    return false;
  }

  return attempt(
    'achievements',
    Sharing.shareAsync(uri, {
      UTI: 'public.png',
      mimeType: 'image/png',
      dialogTitle: 'Share achievement',
    }),
    { title: "Couldn't share", message: 'The achievement card could not be shared.' },
  );
}

/**
 * Write-only permission: saving a card is no reason to ask for the whole
 * library, which the template cover picker asks for separately when it needs it.
 */
export async function saveAchievement(uri: string): Promise<boolean> {
  const permission = await guard('achievements', MediaLibrary.requestPermissionsAsync(true));
  if (permission == null) return false;

  if (!permission.granted) {
    notice({
      title: 'Photos access needed',
      message: 'Allow Pawer to add photos in Settings to save your achievement cards.',
    });
    return false;
  }

  return attempt('achievements', MediaLibrary.Asset.create(uri), {
    title: "Couldn't save",
    message: 'The achievement card could not be added to your photos.',
  });
}
