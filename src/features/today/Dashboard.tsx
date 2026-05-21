import { Activity, CalendarClock, Check, CheckCircle2, Pause, Power, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { format } from 'date-fns';
import type { PlannedPeptide, InjectionLog, DayPlanStatus } from '../../types';
import { todayIso, parseDate } from '../../utils/dates';
import { getAdherence, getCycleState } from '../../utils/cycleEngine';
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
  onLog: (log: Omit<InjectionLog, 'id' | 'createdAt'>) => Promise<void>;
  onOpenCatalog: () => void;
}

export function Dashboard({
  plans,
  logs,
  todayStatuses,
  onLog,
  onOpenCatalog,
}: DashboardProps) {
  const today = todayIso();
  const dueToday = todayStatuses.filter((status) => status.due);
  const completedToday = todayStatuses.filter((status) => status.completed || status.skipped);
  const actionItems = dueToday.filter(
    (status) => !status.completed && !status.skipped
  );
  const actionKeys = new Set(actionItems.map((status) => `${status.plan.id}:${status.date}`));
  const completedKeys = new Set(completedToday.map((status) => `${status.plan.id}:${status.date}`));
  const offCycleToday = todayStatuses.filter(
    (status) => status.cycleState === 'off' && !actionKeys.has(`${status.plan.id}:${status.date}`) && !completedKeys.has(`${status.plan.id}:${status.date}`),
  );
  const adherence = getAdherence(plans, logs, today);
  const totalToday = actionItems.length + completedToday.length;
  const progressValue = totalToday > 0 ? `${completedToday.length}/${totalToday}` : '0/0';
  const progressDetail =
    actionItems.length > 0
      ? `${actionItems.length} remaining today`
      : totalToday > 0
      ? 'All logged for today!'
      : 'No scheduled items today';

  const onCycleToday = todayStatuses.filter((status) => status.cycleState === 'active').length;
  const offCycleCount = plans.length - onCycleToday;
  const activeValue = `${onCycleToday}/${plans.length}`;
  const activeDetail = offCycleCount > 0
    ? `${offCycleCount} off-cycle resting`
    : 'All active protocols';

  const nextChange = todayStatuses
    .filter((status) => status.nextTransitionDate)
    .sort((a, b) => a.nextTransitionDate!.localeCompare(b.nextTransitionDate!))[0];

  let nextChangeValue = 'None';
  let nextChangeDetail = 'No scheduled change';

  if (nextChange && nextChange.nextTransitionDate) {
    try {
      nextChangeValue = format(parseDate(nextChange.nextTransitionDate), 'MMM d');
      const nextState = getCycleState(nextChange.plan, nextChange.nextTransitionDate, logs);
      const phaseText = nextState === 'active' ? 'starts active' : 'goes off-cycle';
      nextChangeDetail = `${nextChange.plan.name} ${phaseText}`;
    } catch (e) {
      nextChangeValue = nextChange.nextTransitionDate;
      nextChangeDetail = nextChange.plan.name;
    }
  }

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
          variant="progress"
          icon={<CheckCircle2 aria-hidden />}
          label="Today's Progress"
          value={progressValue}
          detail={progressDetail}
        />
        <TodayStat
          variant="consistency"
          icon={<Activity aria-hidden />}
          label="Consistency"
          value={`${adherence.rate}%`}
          detail={adherence.due > 0 ? `${adherence.completed}/${adherence.due} logged doses` : 'No doses scheduled'}
        />
        <TodayStat
          variant="active"
          icon={<Power aria-hidden />}
          label="Active Cycles"
          value={activeValue}
          detail={activeDetail}
        />
        <TodayStat
          variant="transition"
          icon={<CalendarClock aria-hidden />}
          label="Next Transition"
          value={nextChangeValue}
          detail={nextChangeDetail}
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
  variant,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  variant: 'progress' | 'consistency' | 'active' | 'transition';
}) {
  return (
    <article className={cx(styles['today-stat-card'], styles[variant])}>
      <div className={styles['stat-header']}>
        <p>{label}</p>
        <span className={styles['stat-icon-wrapper']}>{icon}</span>
      </div>
      <div className={styles['stat-divider']} />
      <div className={styles['stat-body']}>
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
      <span className={styles['today-group-count']}>{count}</span>
    </div>
  );
}
