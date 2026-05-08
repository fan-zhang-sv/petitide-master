import { Activity, Plus } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

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
    <Card as="section" variant="empty">
      <Activity aria-hidden />
      <h2>{title}</h2>
      <p>{body}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          <Plus aria-hidden />
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
