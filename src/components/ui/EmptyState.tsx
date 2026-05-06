import { Activity, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <section className="empty-state">
      <Activity aria-hidden />
      <h2>{title}</h2>
      <p>{body}</p>
      {actionLabel && onAction && (
        <button type="button" className="primary-button" onClick={onAction}>
          <Plus aria-hidden />
          {actionLabel}
        </button>
      )}
    </section>
  );
}
