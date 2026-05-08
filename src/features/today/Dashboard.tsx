import { AlertCircle, CalendarClock, Check, Gauge, Pause, Power, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PlannedPeptide, InjectionLog, DayPlanStatus } from '../../types';
import { addIsoDays, todayIso } from '../../utils/dates';
import { getDayPlanStatus } from '../../utils/cycleEngine';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/Header';
import { Screen } from '../../components/ui/Screen';
import { StatusCard } from './StatusCard';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

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
  const today = todayIso();
  const dueToday = todayStatuses.filter((status) => status.due);
  const completedToday = todayStatuses.filter((status) => status.completed || status.skipped);
  const actionItems = [...overdueStatuses, ...dueToday].filter(
    (status, index, all) =>
      all.findIndex((item) => item.plan.id === status.plan.id && item.date === status.date) === index &&
      !status.completed &&
      !status.skipped
  );
  const actionKeys = new Set(actionItems.map((status) => `${status.plan.id}:${status.date}`));
  const completedKeys = new Set(completedToday.map((status) => `${status.plan.id}:${status.date}`));
  const offCycleToday = todayStatuses.filter(
    (status) => status.cycleState === 'off' && !actionKeys.has(`${status.plan.id}:${status.date}`) && !completedKeys.has(`${status.plan.id}:${status.date}`),
  );
  const lastSevenStatuses = plans.flatMap((plan) =>
    Array.from({ length: 7 }, (_, index) =>
      getDayPlanStatus(plan, logs, addIsoDays(today, -index), today),
    ),
  );
  const sevenDayCompleted = lastSevenStatuses.filter((status) => status.completed).length;
  const sevenDaySkipped = lastSevenStatuses.filter((status) => status.skipped).length;
  const sevenDayMissed = lastSevenStatuses.filter((status) => status.missed).length;
  const sevenDayTotal = sevenDayCompleted + sevenDaySkipped + sevenDayMissed;
  const sevenDayRate = sevenDayTotal === 0 ? 0 : Math.round((sevenDayCompleted / sevenDayTotal) * 100);
  const onCycleToday = todayStatuses.filter((status) => status.cycleState === 'active').length;
  const nextChange = todayStatuses
    .filter((status) => status.nextTransitionDate)
    .sort((a, b) => a.nextTransitionDate!.localeCompare(b.nextTransitionDate!))[0];
  const lowConfidence = todayStatuses.filter((status) => status.scheduleConfidence === 'low').length;

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
    <Screen>
      <PageHeader variant="today" title="Today" meta={today} />

      <section className={styles['today-stat-grid']} aria-label="Today context">
        <TodayStat
          icon={<Gauge aria-hidden />}
          label="7-day completion"
          value={`${sevenDayRate}%`}
          detail={sevenDayTotal > 0 ? `${sevenDayCompleted}/${sevenDayTotal} completed` : 'No logged scheduled days'}
        />
        <TodayStat
          icon={<Power aria-hidden />}
          label="On cycle"
          value={onCycleToday.toString()}
          detail={`${plans.length} active plans`}
        />
        <TodayStat
          icon={<CalendarClock aria-hidden />}
          label="Next change"
          value={nextChange?.nextTransitionDate ?? 'None'}
          detail={nextChange?.plan.name ?? 'No scheduled change'}
        />
        <TodayStat
          icon={<AlertCircle aria-hidden />}
          label="Schedule confidence"
          value={lowConfidence > 0 ? lowConfidence.toString() : 'Stable'}
          detail={lowConfidence > 0 ? 'Low confidence schedules' : 'No low confidence'}
        />
      </section>

      <section className={styles['today-board']}>
        <div className={cx(styles['today-column'], styles.primary)}>
          <GroupHeading icon={<X aria-hidden />} title="Not done" count={actionItems.length} />
          {actionItems.length > 0 ? (
            <div className={styles['today-list']}>
              {actionItems.map((status) => (
                <StatusCard
                  key={`${status.plan.id}-${status.date}`}
                  status={status}
                  logs={logs}
                  onLog={onLog}
                />
              ))}
            </div>
          ) : (
            <div className={styles['today-empty-state']}>
              <Check aria-hidden />
              <span>Clear</span>
            </div>
          )}
        </div>

        {completedToday.length > 0 && (
          <div className={styles['today-column']}>
            <GroupHeading icon={<Check aria-hidden />} title="Done" count={completedToday.length} />
            <div className={styles['today-list']}>
              {completedToday.map((status) => (
                <StatusCard
                  key={`${status.plan.id}-logged`}
                  status={status}
                  logs={logs}
                  onLog={onLog}
                />
              ))}
            </div>
          </div>
        )}

        {offCycleToday.length > 0 && (
          <div className={cx(styles['today-column'], styles.quiet)}>
            <GroupHeading icon={<Pause aria-hidden />} title="Off cycle" count={offCycleToday.length} />
            <div className={styles['today-list']}>
              {offCycleToday.map((status) => (
                <StatusCard
                  key={`${status.plan.id}-off`}
                  status={status}
                  logs={logs}
                  onLog={onLog}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </Screen>
  );
}

function TodayStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className={styles['today-stat-card']}>
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function GroupHeading({ icon, title, count }: { icon: ReactNode; title: string; count: number }) {
  return (
    <div className={styles['today-group-heading']}>
      <span>
        {icon}
        {title}
      </span>
      <strong>{count}</strong>
    </div>
  );
}
