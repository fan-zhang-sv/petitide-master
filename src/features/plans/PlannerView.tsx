import { useState } from 'react';
import { Pencil, Archive, FlaskConical } from 'lucide-react';
import type { PlannedPeptide, InjectionLog } from '../../types';
import { todayIso } from '../../utils/dates';
import { getDayPlanStatus, frequencyLabel, cycleLabel } from '../../utils/cycleEngine';
import { analyzeCycleReview } from '../../utils/cycleReview';
import { formatNumber } from '../../utils/reconstitution';
import { EmptyState } from '../../components/ui/EmptyState';
import { Detail } from '../../components/ui/Detail';
import { CycleReviewCard } from './components/CycleReviewCard';
import { PlanEditDialog } from './PlanEditDialog';

interface PlannerViewProps {
  plans: PlannedPeptide[];
  logs: InjectionLog[];
  onArchive: (id: string) => Promise<void>;
  onUpdatePlan: (id: string, patch: Partial<PlannedPeptide>) => Promise<void>;
  onOpenCatalog: () => void;
}

export function PlannerView({
  plans,
  logs,
  onArchive,
  onUpdatePlan,
  onOpenCatalog,
}: PlannerViewProps) {
  const [editingPlan, setEditingPlan] = useState<PlannedPeptide | null>(null);

  if (plans.length === 0) {
    return (
      <section className="screen">
        <EmptyState
          title="Plan is empty"
          body="Add a protocol from the catalog."
          actionLabel="Browse catalog"
          onAction={onOpenCatalog}
        />
      </section>
    );
  }

  return (
    <section className="screen planner-list">
      {plans.map((plan, index) => {
        const status = getDayPlanStatus(plan, logs, todayIso());
        const review = analyzeCycleReview(plan, logs);
        return (
          <article key={plan.id} className="plan-card" style={{ animationDelay: `${index * 40}ms` }}>
            <div className="card-title-row">
              <h2>{plan.name}</h2>
              <span className={`pill ${status.cycleState}`}>{status.cycleState}</span>
            </div>
            <div className="detail-grid">
              <Detail label="Dose" value={plan.dose} />
              <Detail label="Route" value={plan.route} />
              <Detail label="Frequency" value={frequencyLabel(plan.frequency)} />
              <Detail label="Cycle" value={cycleLabel(plan)} />
              <Detail label="Start" value={plan.startDate} />
              <Detail label="Reminder" value={plan.reminderTime || 'None'} />
            </div>
            {plan.calculator && (
              <div className="calc-summary">
                <FlaskConical aria-hidden />
                {formatNumber(plan.calculator.syringeUnits)} units · {formatNumber(plan.calculator.drawMl, 3)} mL
              </div>
            )}
            <CycleReviewCard planName={plan.name} review={review} />
            {plan.notes && <p className="muted">{plan.notes}</p>}
            <div className="button-row">
              <button type="button" className="primary-button small" onClick={() => setEditingPlan(plan)}>
                <Pencil aria-hidden />
                Edit
              </button>
              <button type="button" className="ghost-button small" onClick={() => void onArchive(plan.id)}>
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
    </section>
  );
}
