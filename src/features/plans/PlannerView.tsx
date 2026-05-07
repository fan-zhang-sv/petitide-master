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
import { PlanEditDialog } from './PlanEditDialog';

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
      <section className="screen">
        <EmptyState
          title="Plan is empty"
          body="Use the Add plan button to pick a protocol from the catalog."
        />
      </section>
    );
  }

  return (
    <section className="screen plans-board" aria-label="Active plans">
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
            className={`plan-row ${status.cycleState} ${status.due && !status.completed ? 'due' : ''}`}
            style={{ animationDelay: `${index * 35}ms` }}
            aria-label={`${plan.name}, ${cycleLabelText}, ${todayLabel} today`}
          >
            <div className="plan-state-rail" title={cycleLabelText}>
              <CycleIcon aria-hidden />
            </div>

            <div className="plan-row-main">
              <div className="plan-name-line">
                <h3>{plan.name}</h3>
                <div className="plan-status-pair" aria-label={`${todayLabel} today`}>
                  <span
                    className={`status-label ${
                      status.completed ? 'done' : status.skipped || status.due ? 'not-done' : 'neutral'
                    }`}
                  >
                    <TodayIcon aria-hidden />
                    {todayLabel}
                  </span>
                </div>
              </div>

              <div className="plan-fact-strip">
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

              <div className={`plan-review-line ${review.level}`}>
                <ReviewIcon aria-hidden />
                <span>{review.headline}</span>
                {review.baseline && <strong>{review.baseline.date}</strong>}
              </div>

              <div className="plan-secondary-line">
                <span>{plan.route}</span>
                <span>Started {plan.startDate}</span>
                <span>{plan.reminderTime || 'No reminder'}</span>
                {plan.calculator && (
                  <span className="plan-calc-inline">
                    <FlaskConical aria-hidden />
                    {formatNumber(plan.calculator.syringeUnits)} units / {formatNumber(plan.calculator.drawMl, 3)} mL
                  </span>
                )}
              </div>
              {plan.notes && <p className="plan-note-line">{plan.notes}</p>}
            </div>

            <div className="plan-row-actions">
              <button
                type="button"
                className="icon-action primary"
                onClick={() => setEditingPlan(plan)}
                aria-label={`Edit ${plan.name}`}
                title="Edit"
              >
                <Pencil aria-hidden />
                <span className="plan-action-label">Edit</span>
              </button>
              <button
                type="button"
                className="icon-action"
                onClick={() => void onArchive(plan.id)}
                aria-label={`Archive ${plan.name}`}
                title="Archive"
              >
                <Archive aria-hidden />
                <span className="plan-action-label">Archive</span>
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
    </section>
  );
}
