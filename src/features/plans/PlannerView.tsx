import { useState } from 'react';
import {
  Archive,
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  FlaskConical,
  Info,
  Pencil,
  Pause,
  Power,
  X,
} from 'lucide-react';
import type { PlannedPeptide, InjectionLog } from '../../types';
import { todayIso } from '../../utils/dates';
import { getDayPlanStatus, frequencyLabel, cycleLabel } from '../../utils/cycleEngine';
import { analyzeCycleReview } from '../../utils/cycleReview';
import { formatNumber } from '../../utils/reconstitution';
import { EmptyState } from '../../components/ui/EmptyState';
import { Screen } from '../../components/ui/Screen';
import { StatusLabel } from '../../components/ui/Badge';
import { PlanEditDialog } from './PlanEditDialog';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

interface PlannerViewProps {
  plans: PlannedPeptide[];
  logs: InjectionLog[];
  onArchive: (id: string) => Promise<void>;
  onUpdatePlan: (id: string, patch: Partial<PlannedPeptide>) => Promise<void>;
}

export function PlannerView({
  plans,
  logs,
  onArchive,
  onUpdatePlan,
}: PlannerViewProps) {
  const [editingPlan, setEditingPlan] = useState<PlannedPeptide | null>(null);

  if (plans.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="Plan is empty"
          body="Use Browse catalog to pick a protocol."
        />
      </Screen>
    );
  }

  return (
    <Screen className={styles['plans-board']} aria-label="Active plans">
      {plans.map((plan, index) => {
        const status = getDayPlanStatus(plan, logs, todayIso());
        const review = analyzeCycleReview(plan, logs);
        const CycleIcon = status.cycleState === 'active' ? Power : status.cycleState === 'off' ? Pause : Clock;
        const TodayIcon = status.completed ? Check : status.skipped ? X : status.due ? X : CalendarClock;
        const ReviewIcon =
          review.level === 'clear'
            ? CheckCircle2
            : review.level === 'watch'
              ? Info
              : AlertCircle;
        const todayLabel = status.completed ? 'Done' : status.skipped ? 'Not done' : status.due ? 'Due' : 'Not due';
        const cycleLabelText =
          status.cycleState === 'active' ? 'On cycle' : status.cycleState === 'off' ? 'Off cycle' : 'Upcoming';

        return (
          <article
            key={plan.id}
            className={cx(styles['plan-row'], styles[status.cycleState], status.due && !status.completed && styles.due)}
            style={{ animationDelay: `${index * 35}ms` }}
            aria-label={`${plan.name}, ${cycleLabelText}, ${todayLabel} today`}
          >
            <div className={styles['plan-state-rail']} title={cycleLabelText}>
              <CycleIcon aria-hidden />
            </div>

            <div className={styles['plan-row-main']}>
              <div className={styles['plan-name-line']}>
                <h3>{plan.name}</h3>
                <div className={styles['plan-status-pair']} aria-label={`${todayLabel} today`}>
                  <StatusLabel tone={status.completed ? 'done' : status.skipped || status.due ? 'not-done' : 'neutral'}>
                    <TodayIcon aria-hidden />
                    {todayLabel}
                  </StatusLabel>
                </div>
              </div>

              <div className={styles['plan-fact-strip']}>
                <span>
                  <strong>Dose</strong>
                  {plan.dose}
                </span>
                <span>
                  <strong>Schedule</strong>
                  {frequencyLabel(plan.frequency)}
                </span>
                <span>
                  <strong>Cycle</strong>
                  {cycleLabel(plan)}
                </span>
                <span>
                  <strong>Next</strong>
                  {status.nextTransitionDate || 'None'}
                </span>
              </div>

              <div className={cx(styles['plan-review-line'], styles[review.level])}>
                <ReviewIcon aria-hidden />
                <span>{review.headline}</span>
                {review.baseline && <strong>{review.baseline.date}</strong>}
              </div>

              <div className={styles['plan-secondary-line']}>
                <span>{plan.route}</span>
                <span>Started {plan.startDate}</span>
                <span>{plan.reminderTime || 'No reminder'}</span>
                {plan.calculator && (
                  <span className={styles['plan-calc-inline']}>
                    <FlaskConical aria-hidden />
                    {formatNumber(plan.calculator.syringeUnits)} units / {formatNumber(plan.calculator.drawMl, 3)} mL
                  </span>
                )}
              </div>
              {plan.notes && <p className={styles['plan-note-line']}>{plan.notes}</p>}
            </div>

            <div className={styles['plan-row-actions']}>
              <button
                type="button"
                className={cx(styles['icon-action'], styles.primary)}
                onClick={() => setEditingPlan(plan)}
                aria-label={`Edit ${plan.name}`}
                title="Edit"
              >
                <Pencil aria-hidden />
                <span className={styles['plan-action-label']}>Edit</span>
              </button>
              <button
                type="button"
                className={styles['icon-action']}
                onClick={() => void onArchive(plan.id)}
                aria-label={`Archive ${plan.name}`}
                title="Archive"
              >
                <Archive aria-hidden />
                <span className={styles['plan-action-label']}>Archive</span>
              </button>
            </div>
          </article>
        );
      })}
      {editingPlan && (
        <PlanEditDialog
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSave={async (patch) => {
            await onUpdatePlan(editingPlan.id, patch);
            setEditingPlan(null);
          }}
        />
      )}
    </Screen>
  );
}
