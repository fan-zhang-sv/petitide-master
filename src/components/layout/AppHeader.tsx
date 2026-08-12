import { Eyebrow } from '../ui/Eyebrow';
import styles from '../../styles/app.module.css';

export function AppHeader() {
  return (
    <header className={styles.topbar}>
      <div className={styles['mobile-brand']}>
        <Eyebrow>Local-first PWA</Eyebrow>
        <h1>Peptitide Master</h1>
      </div>
    </header>
  );
}
