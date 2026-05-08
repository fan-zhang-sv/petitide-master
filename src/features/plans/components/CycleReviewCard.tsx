import { AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import type { CycleReview } from '../../../utils/cycleReview';
import styles from '../../../styles/app.module.css';
import { cx } from '../../../utils/ui/classNames';

interface CycleReviewCardProps {
  planName: string;
  review: CycleReview;
}

export function CycleReviewCard({ review }: CycleReviewCardProps) {
  const Icon =
    review.level === 'clear'
      ? CheckCircle2
      : review.level === 'watch'
        ? Info
        : AlertCircle;

  return (
    <div className={cx(styles['cycle-review-card'], styles[review.level])}>
      <div className={styles['review-head']}>
        <Icon aria-hidden className={styles['review-icon']} />
        <strong>{review.headline}</strong>
      </div>
      <p className={styles.muted}>{review.detail}</p>
      {review.baseline && (
        <div className={styles['review-baseline']}>
          <span>{review.baseline.label}</span>
          <strong>{review.baseline.date}</strong>
        </div>
      )}
    </div>
  );
}
