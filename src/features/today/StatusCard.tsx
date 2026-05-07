import { Check, Pause, Power, SkipForward, X } from 'lucide-react';
import type { DayPlanStatus, InjectionLog } from '../../types';
import { todayIso } from '../../utils/dates';

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
    <article className={`status-card ${getCardKind(status)}`}>
      <div className="status-card-main">
        <div className="today-status-badges">
          <span className={`status-label ${status.cycleState === 'active' ? 'on' : 'off'}`}>
            {status.cycleState === 'active' ? <Power aria-hidden /> : <Pause aria-hidden />}
            {status.cycleState === 'active' ? 'On' : 'Off'}
          </span>
          <span className={`status-label ${status.completed ? 'done' : 'not-done'}`}>
            {status.completed ? <Check aria-hidden /> : <X aria-hidden />}
            {status.completed ? 'Done' : 'Not done'}
          </span>
        </div>
        <h3>{status.plan.name}</h3>
        <p>{status.date !== todayIso() ? `${status.date} · ` : ''}{status.plan.dose || 'Dose not set'}</p>
      </div>

      {canLog && (
        <div className="today-row-actions">
          {!status.completed && (
            <button type="button" className="primary-button small" onClick={() => void log('completed')}>
              <Check aria-hidden />
              Done
            </button>
          )}
          {!status.skipped && (
            <button type="button" className="ghost-button small" onClick={() => void log('skipped')}>
              <SkipForward aria-hidden />
              Not done
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
