import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Check, SkipForward } from 'lucide-react';
import type { DayPlanStatus, InjectionLog } from '../../types';
import { todayIso } from '../../utils/dates';
import { frequencyLabel, cycleLabel } from '../../utils/cycleEngine';

interface StatusCardProps {
  status: DayPlanStatus;
  logs: InjectionLog[];
  onLog: (log: Omit<InjectionLog, 'id' | 'createdAt'>) => Promise<void>;
  simple?: boolean;
  style?: CSSProperties;
}

export function StatusCard({
  status,
  logs,
  onLog,
  simple = false,
  style,
}: StatusCardProps) {
  const existingLog = logs.find((log) => log.planId === status.plan.id && log.date === status.date);
  const [site, setSite] = useState(existingLog?.site ?? status.plan.injectionSites[0] ?? '');
  const [notes, setNotes] = useState(existingLog?.notes ?? '');
  const [sideEffects, setSideEffects] = useState(existingLog?.sideEffects ?? '');

  const log = (logStatus: 'completed' | 'skipped') =>
    onLog({
      planId: status.plan.id,
      date: status.date,
      status: logStatus,
      actualDose: status.plan.dose,
      site,
      notes,
      sideEffects,
    });

  return (
    <article className={`status-card ${status.cycleState} ${simple ? 'simple' : ''}`} style={style}>
      <div>
        <div className="card-title-row">
          <h3>{status.plan.name}</h3>
          <span className={`pill ${status.completed || status.skipped ? 'done' : status.cycleState}`}>
            {status.completed
              ? 'Completed'
              : status.skipped
                ? 'Skipped'
                : status.due
                  ? status.overdue
                    ? 'Due'
                    : 'Planned'
                  : status.cycleState === 'off'
                    ? 'Off cycle'
                    : 'Not due'}
          </span>
        </div>
        <p className={simple ? 'action-line' : ''}>
          {status.date !== todayIso() ? `${status.date} · ` : ''}
          {status.plan.dose || 'Dose not set'}
          {!simple ? ` · ${frequencyLabel(status.plan.frequency)}` : ''}
        </p>
        {!simple && (
          <p className="muted">
            {cycleLabel(status.plan)}
            {status.nextTransitionDate ? ` · next change ${status.nextTransitionDate}` : ''}
          </p>
        )}
      </div>

      {status.due && !status.completed && !status.skipped && (
        <form className="log-form" onSubmit={(event) => event.preventDefault()}>
          <label>
            Where did you inject?
            <select value={site} onChange={(event) => setSite(event.target.value)}>
              {[...new Set([site, ...status.plan.injectionSites].filter(Boolean))].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <details className="inline-details">
            <summary>Add notes or side effects</summary>
            <label>
              Notes
              <input value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
            <label>
              Side effects
              <input value={sideEffects} onChange={(event) => setSideEffects(event.target.value)} />
            </label>
          </details>
          <div className="button-row">
            <button type="button" className="primary-button small" onClick={() => void log('completed')}>
              <Check aria-hidden />
              Mark done
            </button>
            <button type="button" className="ghost-button small" onClick={() => void log('skipped')}>
              <SkipForward aria-hidden />
              Skip
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
