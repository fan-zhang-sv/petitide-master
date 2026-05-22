import { Check, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import type { DayPlanStatus, InjectionLog } from '../../types';
import { todayIso, parseDate } from '../../utils/dates';
import { getCycleState } from '../../utils/cycleEngine';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

interface StatusCardProps {
  status: DayPlanStatus;
  logs: InjectionLog[];
  onLog: (log: Omit<InjectionLog, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteLog: (planId: string, date: string) => Promise<void>;
}

export function StatusCard({
  status,
  onLog,
  onDeleteLog,
}: StatusCardProps) {
  const today = todayIso();
  const cycleState = getCycleState(status.plan, status.date);
  const canLog = status.date <= today && cycleState !== 'upcoming';
  const isOverdue = status.date < today;

  let statusLabel: string;
  let metaClass: string;

  if (status.done) {
    if (status.log?.status === 'skipped') {
      statusLabel = 'Skipped';
      metaClass = styles['meta-skipped'];
    } else {
      statusLabel = 'Completed';
      metaClass = styles['meta-completed'];
    }
  } else if (!status.onTrack) {
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

  const showLogButton = !status.done && canLog;
  const showUndoButton = status.done;

  return (
    <article className={cx(styles['status-card'], styles[getCardKind(status)])}>
      <div className={styles['status-card-main']}>
        <h3>{status.plan.name}</h3>
        <p className={cx(styles['status-card-meta'], metaClass)}>{metaText}</p>
      </div>

      {(showLogButton || showUndoButton) && (
        <div className={styles['today-row-actions']}>
          {showLogButton && (
            <button
              className={cx(styles['action-btn'], styles.complete)}
              onClick={() =>
                void onLog({
                  planId: status.plan.id,
                  date: status.date,
                  status: 'completed',
                  actualDose: status.plan.dose,
                  site: status.plan.injectionSites[0],
                })
              }
              aria-label="Log completed dose"
              title="Log dose"
            >
              <Check aria-hidden />
              <span>Log</span>
            </button>
          )}
          {showUndoButton && (
            <button
              className={cx(styles['action-btn'], styles.skip)}
              onClick={() => void onDeleteLog(status.plan.id, status.date)}
              aria-label="Undo completed dose"
              title="Undo dose"
            >
              <RotateCcw aria-hidden />
              <span>Undo</span>
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function getCardKind(status: DayPlanStatus) {
  if (status.done) return 'done';
  if (status.onTrack) return 'not-done';
  return 'off';
}
