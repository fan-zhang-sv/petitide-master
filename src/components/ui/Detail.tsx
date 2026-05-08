import styles from '../../styles/app.module.css';

export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles['detail-item']}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
