import { Syringe, Archive, Library, AlertTriangle, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Eyebrow } from '../ui/Eyebrow';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';
import { useAuth } from '../../auth/AuthContext';

interface OnboardingProps {
  onAccept: () => Promise<void>;
}

export function Onboarding({ onAccept }: OnboardingProps) {
  const { firebaseEnabled, user } = useAuth();
  const cloudAware = firebaseEnabled || Boolean(user);

  return (
    <main className={styles.onboarding}>
      <section className={styles['onboarding-panel']}>
        <div className={styles['brand-mark']}>
          <Syringe aria-hidden />
        </div>
        <Eyebrow>Peptide Master</Eyebrow>
        <h1>Welcome to Peptide Master</h1>
        <div className={styles['feature-list']}>
          <div className={styles['feature-tile']}>
            <Archive aria-hidden className={styles['feature-icon']} />
            <div>
              <strong>{cloudAware ? 'Local-first, optional sync' : 'Local & Private'}</strong>
              <span>
                {cloudAware
                  ? 'Track protocols on your device, then sign in with Google to sync.'
                  : 'Track protocols and math securely on your device.'}
              </span>
            </div>
          </div>
          <div className={styles['feature-tile']}>
            <Library aria-hidden className={styles['feature-icon']} />
            <div>
              <strong>Community Templates</strong>
              <span>Start with references, but edit before use.</span>
            </div>
          </div>
          <div className={cx(styles['feature-tile'], styles.warning)}>
            <AlertTriangle aria-hidden className={styles['feature-icon']} />
            <div>
              <strong>Not Medical Advice</strong>
              <span>Educational only. Always consult a clinician.</span>
            </div>
          </div>
        </div>
        <Button variant="primary" onClick={() => void onAccept()}>
          <Check aria-hidden />
          I understand
        </Button>
      </section>
    </main>
  );
}
