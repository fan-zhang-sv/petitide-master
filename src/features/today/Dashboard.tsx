import { Check } from 'lucide-react';
import type { PlannedPeptide, InjectionLog, DayPlanStatus } from '../../types';
import { todayIso } from '../../utils/dates';
import { Metric } from '../../components/ui/Metric';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusCard } from './StatusCard';
import { getAdherence } from '../../utils/cycleEngine';

interface DashboardProps {
  plans: PlannedPeptide[];
  logs: InjectionLog[];
  todayStatuses: DayPlanStatus[];
  overdueStatuses: DayPlanStatus[];
  onLog: (log: Omit<InjectionLog, 'id' | 'createdAt'>) => Promise<void>;
  onOpenCatalog: () => void;
}

export function Dashboard({
  plans,
  logs,
  todayStatuses,
  overdueStatuses,
  onLog,
  onOpenCatalog,
}: DashboardProps) {
  const adherence = getAdherence(plans, logs);
  const dueToday = todayStatuses.filter((status) => status.due);
  const completedToday = todayStatuses.filter((status) => status.completed || status.skipped);
  const actionItems = [...overdueStatuses, ...dueToday].filter(
    (status, index, all) =>
      all.findIndex((item) => item.plan.id === status.plan.id && item.date === status.date) === index &&
      !status.completed &&
      !status.skipped
  );
  const offCycleToday = todayStatuses.filter((status) => status.cycleState === 'off');
  const upcomingChanges = todayStatuses
    .filter((status) => status.nextTransitionDate)
    .sort((a, b) => a.nextTransitionDate!.localeCompare(b.nextTransitionDate!))
    .slice(0, 4);

  if (plans.length === 0) {
    return (
      <EmptyState
        title="No active plan"
        body="Add a protocol from the catalog."
        actionLabel="Open catalog"
        onAction={onOpenCatalog}
      />
    );
  }

  return (
    <section className="screen">
      <section className="today-hero">
        <div>
          <p className="eyebrow">Today · {todayIso()}</p>
          <h2>
            {actionItems.length > 0
              ? `${actionItems.length} Action${actionItems.length === 1 ? '' : 's'}`
              : 'All Clear'}
          </h2>
          <p className="muted">
            {actionItems.length > 0 ? 'Items need your attention' : 'You are all caught up'}
          </p>
        </div>
        <div className="today-score">
          <strong>{adherence.due > 0 ? `${adherence.rate}%` : 'New'}</strong>
          <span>{adherence.due > 0 ? 'past adherence' : 'no past days'}</span>
        </div>
      </section>

      <div className="metric-grid today-metrics">
        <Metric label="Do now" value={actionItems.length} tone="" />
        <Metric label="Off cycle" value={offCycleToday.length} tone="" />
        <Metric label="Logged today" value={completedToday.length} tone="" />
      </div>

      <section className="section-band essentials">
        <div className="section-heading">
          <h2>Essential actions</h2>
          <span>{actionItems.length ? 'Needs attention' : 'Clear'}</span>
        </div>
        {actionItems.length > 0 ? (
          <div className="stack">
            {actionItems.map((status, index) => (
              <StatusCard
                key={`${status.plan.id}-${status.date}`}
                status={status}
                logs={logs}
                onLog={onLog}
                simple
                style={{ animationDelay: `${index * 40}ms` }}
              />
            ))}
          </div>
        ) : (
          <div className="clear-state">
            <Check aria-hidden />
            <div>
              <h3>You're all clear today.</h3>
              <p>Future items stay visible below.</p>
            </div>
          </div>
        )}
      </section>

      <details className="section-band">
        <summary>Plan status and upcoming cycle changes</summary>
        <div className="support-grid">
          {upcomingChanges.length > 0 ? (
            upcomingChanges.map((status) => (
              <StatusCard
                key={`${status.plan.id}-future`}
                status={status}
                logs={logs}
                onLog={onLog}
                simple
              />
            ))
          ) : (
            <p className="muted">No upcoming changes calculated.</p>
          )}
        </div>
      </details>
    </section>
  );
}
