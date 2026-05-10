import { useState } from 'react';
import { Download, Plus, Share, Smartphone, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import styles from '../../styles/app.module.css';

export function InstallPrompt() {
  const { visible, platform, install, dismiss } = useInstallPrompt();
  const [showInstructions, setShowInstructions] = useState(false);

  if (!visible) return null;

  const isIOS = platform === 'ios-safari';
  const primaryLabel = platform === 'android-native' ? 'Install' : 'How';

  const handlePrimary = async () => {
    if (platform === 'android-native') {
      await install();
      return;
    }
    setShowInstructions(true);
  };

  return (
    <>
      <div role="dialog" aria-label="Install Petitide" className={styles['install-banner']}>
        <span className={styles['install-banner-icon']} aria-hidden>
          <Smartphone />
        </span>
        <div className={styles['install-banner-body']}>
          <strong>Add to your home screen</strong>
          <span>One-tap launch, full-screen, works offline.</span>
        </div>
        <div className={styles['install-banner-actions']}>
          <Button variant="primary" size="small" onClick={() => void handlePrimary()}>
            <Download aria-hidden />
            {primaryLabel}
          </Button>
          <button
            type="button"
            aria-label="Dismiss install prompt"
            className={styles['install-banner-close']}
            onClick={dismiss}
          >
            <X aria-hidden />
          </button>
        </div>
      </div>

      {showInstructions && (
        <div
          className={styles['install-modal-backdrop']}
          role="presentation"
          onClick={() => setShowInstructions(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-instructions-title"
            className={styles['install-modal']}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles['install-modal-header']}>
              <h2 id="install-instructions-title">
                {isIOS ? 'Install on iPhone or iPad' : 'Install on Android'}
              </h2>
              <button
                type="button"
                aria-label="Close"
                className={styles['install-banner-close']}
                onClick={() => setShowInstructions(false)}
              >
                <X aria-hidden />
              </button>
            </div>

            {isIOS ? (
              <ol className={styles['install-steps']}>
                <li>
                  <span className={styles['install-step-number']}>1</span>
                  <div className={styles['install-step-text']}>
                    <strong>Tap the Share icon</strong>
                    <span>At the bottom of Safari (top on iPad).</span>
                  </div>
                  <Share aria-hidden className={styles['install-step-icon']} />
                </li>
                <li>
                  <span className={styles['install-step-number']}>2</span>
                  <div className={styles['install-step-text']}>
                    <strong>Choose "Add to Home Screen"</strong>
                    <span>Scroll the share sheet to find it.</span>
                  </div>
                  <Plus aria-hidden className={styles['install-step-icon']} />
                </li>
                <li>
                  <span className={styles['install-step-number']}>3</span>
                  <div className={styles['install-step-text']}>
                    <strong>Tap "Add"</strong>
                    <span>Petitide opens like a native app.</span>
                  </div>
                </li>
              </ol>
            ) : (
              <ol className={styles['install-steps']}>
                <li>
                  <span className={styles['install-step-number']}>1</span>
                  <div className={styles['install-step-text']}>
                    <strong>Open the browser menu</strong>
                    <span>Tap the three-dot menu in the top right.</span>
                  </div>
                </li>
                <li>
                  <span className={styles['install-step-number']}>2</span>
                  <div className={styles['install-step-text']}>
                    <strong>Tap "Install app" or "Add to Home screen"</strong>
                    <span>The exact label depends on your browser.</span>
                  </div>
                </li>
                <li>
                  <span className={styles['install-step-number']}>3</span>
                  <div className={styles['install-step-text']}>
                    <strong>Confirm</strong>
                    <span>Petitide will appear on your home screen.</span>
                  </div>
                </li>
              </ol>
            )}

            <div className={styles['install-modal-footer']}>
              <Button variant="primary" onClick={() => setShowInstructions(false)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
