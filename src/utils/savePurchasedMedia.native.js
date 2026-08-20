import { File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';

export const savePurchasedMedia = async ({ url, filename }) => {
  const permission = await requestPermissionsAsync(true, []);
  if (!permission.granted) {
    return { ok: false, reason: 'permission' };
  }

  const destination = new File(Paths.cache, filename);
  const downloadedFile = await File.downloadFileAsync(url, destination, { idempotent: true });
  await Asset.create(downloadedFile.uri);
  return { ok: true };
};
