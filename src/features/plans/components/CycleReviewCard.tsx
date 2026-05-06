import { AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import type { CycleReview } from '../../../utils/cycleReview';

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
    <div className={`cycle-review-card ${review.level}`}>
      <div className="review-head">
        <Icon aria-hidden className="review-icon" />
        <strong>{review.headline}</strong>
      </div>
      <p className="muted">{review.detail}</p>
      {review.baseline && (
        <div className="review-baseline">
          <span>{review.baseline.label}</span>
          <strong>{review.baseline.date}</strong>
        </div>
      )}
    </div>
  );
}
