import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallPlatform =
  | 'ios-safari'
  | 'android-native'
  | 'android-instructions'
  | 'none';

const DISMISS_KEY = 'peptitide:install-prompt:dismissed-at';
const INSTALLED_KEY = 'peptitide:install-prompt:installed';
// Keep these only as migration sources for people who used the app before the
// brand spelling was corrected.
const LEGACY_DISMISS_KEY = 'petitide:install-prompt:dismissed-at';
const LEGACY_INSTALLED_KEY = 'petitide:install-prompt:installed';
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

function safeRead(key: string, legacyKey: string): string | null {
  try {
    const current = localStorage.getItem(key);
    if (current !== null) return current;

    const legacy = localStorage.getItem(legacyKey);
    if (legacy !== null) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(legacyKey);
    }
    return legacy;
  } catch {
    return null;
  }
}

function safeReadNumber(key: string, legacyKey: string): number {
  const value = safeRead(key, legacyKey);
  return value ? Number(value) || 0 : 0;
}

function safeReadBool(key: string, legacyKey: string): boolean {
  return safeRead(key, legacyKey) === '1';
}

function safeWrite(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — fail silently */
  }
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS Safari sets navigator.standalone when launched from the home screen.
  return Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function detectIOSSafari(ua: string): boolean {
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  if (!isIOS) return false;
  // Only Safari can install PWAs on iOS — exclude other browsers and in-app webviews.
  if (/crios|fxios|edgios|opios|gsa/i.test(ua)) return false;
  if (/fban|fbav|instagram|line|wv\)/i.test(ua)) return false;
  return /safari/i.test(ua);
}

function detectAndroid(ua: string): boolean {
  return /android/i.test(ua);
}

export interface InstallPromptState {
  visible: boolean;
  platform: InstallPlatform;
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  dismiss: () => void;
}

export function useInstallPrompt(): InstallPromptState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() =>
    safeReadBool(INSTALLED_KEY, LEGACY_INSTALLED_KEY),
  );
  const [dismissedAt, setDismissedAt] = useState<number>(() =>
    safeReadNumber(DISMISS_KEY, LEGACY_DISMISS_KEY),
  );
  const [standalone, setStandalone] = useState<boolean>(() => detectStandalone());
  // Capture mount time once so the cooldown check stays pure across renders.
  // Dismissals during the session set dismissedAt > mountedAt, which keeps
  // cooldownActive true and hides the banner — same result as a live clock.
  const [mountedAt] = useState<number>(() => Date.now());

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      safeWrite(INSTALLED_KEY, '1');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const mql = window.matchMedia?.('(display-mode: standalone)');
    const onModeChange = () => setStandalone(detectStandalone());
    mql?.addEventListener?.('change', onModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      mql?.removeEventListener?.('change', onModeChange);
    };
  }, []);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const iosSafari = detectIOSSafari(ua);
  const android = detectAndroid(ua);

  let platform: InstallPlatform = 'none';
  if (iosSafari) platform = 'ios-safari';
  else if (android && deferred) platform = 'android-native';
  else if (android) platform = 'android-instructions';

  const cooldownActive = mountedAt - dismissedAt < DISMISS_COOLDOWN_MS;
  const visible = !standalone && !installed && !cooldownActive && platform !== 'none';

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) return 'unavailable';
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome !== 'accepted') {
        const now = Date.now();
        setDismissedAt(now);
        safeWrite(DISMISS_KEY, String(now));
      }
      return choice.outcome;
    } catch {
      setDeferred(null);
      return 'unavailable';
    }
  }, [deferred]);

  const dismiss = useCallback(() => {
    const now = Date.now();
    setDismissedAt(now);
    safeWrite(DISMISS_KEY, String(now));
  }, []);

  return { visible, platform, install, dismiss };
}
