import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

interface MetricProps {
  label: string;
  value: string | number;
  tone?: string;
}

export function Metric({ label, value, tone }: MetricProps) {
  return (
    <div className={cx(styles.metric, tone && styles[tone])}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
