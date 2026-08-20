import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

const CAPTURE_KEY = 'protected-media';

export default function ScreenCaptureGuard() {
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;

    const timer = setTimeout(() => {
      if (typeof ScreenCapture.preventScreenCaptureAsync === 'function') {
        ScreenCapture.preventScreenCaptureAsync(CAPTURE_KEY).catch((error) => {
          console.warn('Não foi possível ativar a proteção global de tela.', error);
        });
      }
      if (Platform.OS === 'ios' && typeof ScreenCapture.enableAppSwitcherProtectionAsync === 'function') {
        ScreenCapture.enableAppSwitcherProtectionAsync(0.9).catch((error) => {
          console.warn('Não foi possível proteger a prévia do aplicativo.', error);
        });
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (typeof ScreenCapture.allowScreenCaptureAsync === 'function') {
        ScreenCapture.allowScreenCaptureAsync(CAPTURE_KEY).catch(() => {});
      }
      if (Platform.OS === 'ios' && typeof ScreenCapture.disableAppSwitcherProtectionAsync === 'function') {
        ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
      }
    };
  }, []);

  return null;
}
