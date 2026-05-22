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
import { getDayPlanStatus, frequencyLabel, cycleLabel, getCycleState } from '../../utils/cycleEngine';
import { analyzeCycleReview } from '../../utils/cycleReview';
import { formatNumber } from '../../utils/reconstitution';
import { EmptyState } from '../../components/ui/EmptyState';
import { Screen } from '../../components/ui/Screen';
import { Pill, StatusLabel } from '../../components/ui/Badge';
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
        const cycleState = getCycleState(plan, todayIso(), logs);
        const CycleIcon = cycleState === 'active' ? Power : cycleState === 'off' ? Pause : Clock;

        let TodayIcon = CalendarClock;
        let todayLabel = 'Not due';
        let todayTone: 'done' | 'not-done' | 'neutral' = 'neutral';

        if (status.done) {
          if (status.log?.status === 'skipped') {
            TodayIcon = X;
            todayLabel = 'Skipped';
            todayTone = 'neutral';
          } else {
            TodayIcon = Check;
            todayLabel = 'Done';
            todayTone = 'done';
          }
        } else if (status.onTrack) {
          TodayIcon = X;
          todayLabel = 'Due';
          todayTone = 'not-done';
        }

        const ReviewIcon =
          review.level === 'clear'
            ? CheckCircle2
            : review.level === 'watch'
              ? Info
              : AlertCircle;
        const cycleLabelText =
          cycleState === 'active' ? 'On cycle' : cycleState === 'off' ? 'Off cycle' : 'Upcoming';

        return (
          <article
            key={plan.id}
            className={cx(
              styles['catalog-row'],
              styles[cycleState],
              status.onTrack && !status.done && styles.due,
            )}
            style={{ animationDelay: `${index * 35}ms` }}
            aria-label={`${plan.name}, ${cycleLabelText}, ${todayLabel} today`}
          >
            <div className={styles['catalog-row-main']}>
              <div className={styles['catalog-title-line']}>
                <div>
                  <h3>{plan.name}</h3>
                  <p>
                    <span>{plan.route}</span>
                    <span>Started {plan.startDate}</span>
                    <span>{plan.reminderTime || 'No reminder'}</span>
                    {plan.calculator && (
                      <span className={styles['plan-calc-inline']}>
                        <FlaskConical aria-hidden />
                        {formatNumber(plan.calculator.syringeUnits)} units / {formatNumber(plan.calculator.drawMl, 3)} mL
                      </span>
                    )}
                  </p>
                </div>
                <Pill tone={cycleState === 'active' ? 'on' : cycleState === 'off' ? 'off' : 'neutral'}>
                  <CycleIcon aria-hidden />
                  {cycleLabelText}
                </Pill>
              </div>

              <dl className={styles['catalog-fact-grid']}>
                <div>
                  <dt>Dose</dt>
                  <dd>{plan.dose}</dd>
                </div>
                <div>
                  <dt>Schedule</dt>
                  <dd>{frequencyLabel(plan.frequency)}</dd>
                </div>
                <div>
                  <dt>Cycle</dt>
                  <dd>{cycleLabel(plan)}</dd>
                </div>
                <div>
                  <dt>Next</dt>
                  <dd>{status.nextTransitionDate || 'None'}</dd>
                </div>
                <div>
                  <dt>Today</dt>
                  <dd>
                    <StatusLabel tone={todayTone}>
                      <TodayIcon aria-hidden />
                      {todayLabel}
                    </StatusLabel>
                  </dd>
                </div>
                <div>
                  <dt>Baseline</dt>
                  <dd>{review.baseline?.date || status.scheduleAnchorDate || plan.startDate}</dd>
                </div>
              </dl>

              <div className={styles['catalog-copy-grid']}>
                <div>
                  <strong>Review</strong>
                  <p>
                    <ReviewIcon aria-hidden />
                    {review.headline}
                  </p>
                </div>
                <div>
                  <strong>Details</strong>
                  <p>{review.detail}</p>
                </div>
                <div>
                  <strong>Notes</strong>
                  <p>{plan.notes || 'No notes saved for this plan.'}</p>
                </div>
              </div>

              <div className={styles['catalog-flag-line']}>
                {review.facts.map((fact) => (
                  <span key={fact}>{fact}</span>
                ))}
              </div>
            </div>

            <div className={styles['plan-catalog-actions']}>
              <button
                type="button"
                className={styles['catalog-add-button']}
                onClick={() => setEditingPlan(plan)}
                aria-label={`Edit ${plan.name}`}
              >
                <Pencil aria-hidden />
                Edit
              </button>
              <button
                type="button"
                className={cx(styles['catalog-add-button'], styles['catalog-archive-button'])}
                onClick={() => void onArchive(plan.id)}
                aria-label={`Archive ${plan.name}`}
              >
                <Archive aria-hidden />
                Archive
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
