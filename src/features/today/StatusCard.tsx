import { Check, SkipForward } from 'lucide-react';
import { format } from 'date-fns';
import type { DayPlanStatus, InjectionLog } from '../../types';
import { todayIso, parseDate } from '../../utils/dates';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

interface StatusCardProps {
  status: DayPlanStatus;
  logs: InjectionLog[];
  onLog: (log: Omit<InjectionLog, 'id' | 'createdAt'>) => Promise<void>;
}

export function StatusCard({
  status,
  onLog,
}: StatusCardProps) {
  const today = todayIso();
  const canLog = status.date <= today && status.cycleState !== 'upcoming';
  const isOverdue = status.date < today;

  const log = (logStatus: 'completed' | 'skipped') =>
    onLog({
      planId: status.plan.id,
      date: status.date,
      status: logStatus,
      actualDose: status.plan.dose,
      site: status.plan.injectionSites[0],
    });

  let statusLabel = '';
  let metaClass = '';

  if (status.completed) {
    statusLabel = 'Completed';
    metaClass = styles['meta-completed'];
  } else if (status.skipped) {
    statusLabel = 'Skipped';
    metaClass = styles['meta-skipped'];
  } else if (status.cycleState === 'off') {
    statusLabel = 'Off-cycle';
    metaClass = styles['meta-off'];
  } else if (isOverdue) {
    statusLabel = 'Overdue';
    metaClass = styles['meta-overdue'];
  } else {
    statusLabel = 'Scheduled';
    metaClass = styles['meta-scheduled'];
  }

  const formattedDate = status.date !== today ? format(parseDate(status.date), 'MMM d') : '';
  const doseText = status.plan.dose || 'Dose not set';

  const metaParts = [statusLabel, formattedDate, doseText].filter(Boolean);
  const metaText = metaParts.join(' · ');

  return (
    <article className={cx(styles['status-card'], styles[getCardKind(status)])}>
      <div className={styles['status-card-main']}>
        <h3>{status.plan.name}</h3>
        <p className={cx(styles['status-card-meta'], metaClass)}>{metaText}</p>
      </div>

      {canLog && (
        <div className={styles['today-row-actions']}>
          {!status.completed && (
            <button
              className={cx(styles['action-btn'], styles.complete)}
              onClick={() => void log('completed')}
              aria-label="Log completed dose"
              title="Log dose"
            >
              <Check aria-hidden />
              <span>Log</span>
            </button>
          )}
          {!status.skipped && (
            <button
              className={cx(styles['action-btn'], styles.skip)}
              onClick={() => void log('skipped')}
              aria-label="Skip dose"
              title="Skip dose"
            >
              <SkipForward aria-hidden />
              <span>Skip</span>
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function getCardKind(status: DayPlanStatus) {
  if (status.completed) return 'done';
  if (status.due || status.skipped) return 'not-done';
  if (status.cycleState === 'off') return 'off';
  return 'on';
}

