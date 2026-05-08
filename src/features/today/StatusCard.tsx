import { Check, Pause, Power, SkipForward, X } from 'lucide-react';
import type { DayPlanStatus, InjectionLog } from '../../types';
import { todayIso } from '../../utils/dates';
import { Button } from '../../components/ui/Button';
import { StatusLabel } from '../../components/ui/Badge';
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
  const canLog = status.date <= todayIso() && status.cycleState !== 'upcoming';

  const log = (logStatus: 'completed' | 'skipped') =>
    onLog({
      planId: status.plan.id,
      date: status.date,
      status: logStatus,
      actualDose: status.plan.dose,
      site: status.plan.injectionSites[0],
    });

  return (
    <article className={cx(styles['status-card'], styles[getCardKind(status)])}>
      <div className={styles['status-card-main']}>
        <div className={styles['today-status-badges']}>
          <StatusLabel tone={status.cycleState === 'active' ? 'on' : 'off'}>
            {status.cycleState === 'active' ? <Power aria-hidden /> : <Pause aria-hidden />}
            {status.cycleState === 'active' ? 'On' : 'Off'}
          </StatusLabel>
          <StatusLabel tone={status.completed ? 'done' : 'not-done'}>
            {status.completed ? <Check aria-hidden /> : <X aria-hidden />}
            {status.completed ? 'Done' : 'Not done'}
          </StatusLabel>
        </div>
        <h3>{status.plan.name}</h3>
        <p>{status.date !== todayIso() ? `${status.date} · ` : ''}{status.plan.dose || 'Dose not set'}</p>
      </div>

      {canLog && (
        <div className={styles['today-row-actions']}>
          {!status.completed && (
            <Button variant="primary" size="small" onClick={() => void log('completed')}>
              <Check aria-hidden />
              Done
            </Button>
          )}
          {!status.skipped && (
            <Button variant="ghost" size="small" onClick={() => void log('skipped')}>
              <SkipForward aria-hidden />
              Not done
            </Button>
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
