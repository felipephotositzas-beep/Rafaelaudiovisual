import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

const CAPTURE_KEY = 'protected-media';
const WEB_STYLE_ID = 'protected-media-styles';
const WEB_ACTIVE_CLASS = 'protected-media-open';
const WEB_SHIELD_CLASS = 'capture-shield-active';

const ensureWebStyles = () => {
  if (document.getElementById(WEB_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = WEB_STYLE_ID;
  style.textContent = `
    [data-protected-media="true"],
    [data-protected-media="true"] * {
      -webkit-touch-callout: none !important;
      -webkit-user-drag: none !important;
      user-drag: none !important;
      -webkit-user-select: none !important;
      user-select: none !important;
    }

    body.${WEB_SHIELD_CLASS} [data-protected-media="true"] {
      visibility: hidden !important;
    }

    @media print {
      body.${WEB_ACTIVE_CLASS} {
        visibility: hidden !important;
      }
    }
  `;
  document.head.appendChild(style);
};

const isProtectedTarget = (target) =>
  target instanceof Element &&
  Boolean(target.closest('[data-protected-media="true"]'));

export default function ScreenCaptureGuard({
  active = true,
  captureKey = CAPTURE_KEY,
  onProtectionChange,
}) {
  const shieldTimerRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    if (Platform.OS === 'web') {
      ensureWebStyles();
      document.body.classList.add(WEB_ACTIVE_CLASS);

      const clearShieldTimer = () => {
        if (shieldTimerRef.current) {
          window.clearTimeout(shieldTimerRef.current);
          shieldTimerRef.current = null;
        }
      };

      const setShielded = (shielded, releaseAfter = 0) => {
        clearShieldTimer();
        document.body.classList.toggle(WEB_SHIELD_CLASS, shielded);
        onProtectionChange?.(shielded);

        if (shielded && releaseAfter > 0) {
          shieldTimerRef.current = window.setTimeout(() => {
            document.body.classList.remove(WEB_SHIELD_CLASS);
            onProtectionChange?.(false);
            shieldTimerRef.current = null;
          }, releaseAfter);
        }
      };

      const blockProtectedAssetAction = (event) => {
        if (isProtectedTarget(event.target)) event.preventDefault();
      };

      const handleKeyDown = (event) => {
        const key = String(event.key || '').toLowerCase();
        const hasCommandModifier = event.ctrlKey || event.metaKey;
        const blocksBrowserExport = hasCommandModifier && (key === 's' || key === 'p');

        if (key === 'printscreen' || blocksBrowserExport) {
          event.preventDefault();
          setShielded(true, 1600);
        }
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState !== 'visible') {
          setShielded(true);
          return;
        }

        setShielded(true, 180);
      };

      const handleWindowBlur = () => setShielded(true);
      const handleWindowFocus = () => {
        if (document.visibilityState === 'visible') {
          setShielded(true, 180);
        }
      };
      const handleBeforePrint = () => setShielded(true);
      const handleAfterPrint = () => setShielded(false);

      document.addEventListener('contextmenu', blockProtectedAssetAction, true);
      document.addEventListener('dragstart', blockProtectedAssetAction, true);
      document.addEventListener('selectstart', blockProtectedAssetAction, true);
      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);
      window.addEventListener('beforeprint', handleBeforePrint);
      window.addEventListener('afterprint', handleAfterPrint);

      return () => {
        clearShieldTimer();
        document.removeEventListener('contextmenu', blockProtectedAssetAction, true);
        document.removeEventListener('dragstart', blockProtectedAssetAction, true);
        document.removeEventListener('selectstart', blockProtectedAssetAction, true);
        document.removeEventListener('keydown', handleKeyDown, true);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleWindowBlur);
        window.removeEventListener('focus', handleWindowFocus);
        window.removeEventListener('beforeprint', handleBeforePrint);
        window.removeEventListener('afterprint', handleAfterPrint);
        document.body.classList.remove(WEB_ACTIVE_CLASS, WEB_SHIELD_CLASS);
      };
    }

    const timer = setTimeout(() => {
      if (typeof ScreenCapture.preventScreenCaptureAsync === 'function') {
        ScreenCapture.preventScreenCaptureAsync(captureKey).catch((error) => {
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
        ScreenCapture.allowScreenCaptureAsync(captureKey).catch(() => {});
      }
      if (Platform.OS === 'ios' && typeof ScreenCapture.disableAppSwitcherProtectionAsync === 'function') {
        ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
      }
    };
  }, [active, captureKey, onProtectionChange]);

  return null;
}
