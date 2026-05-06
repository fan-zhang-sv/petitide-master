import { Check, SkipForward } from 'lucide-react';
import type { DayPlanStatus, InjectionLog } from '../../types';
import { todayIso } from '../../utils/dates';

interface CalendarStatusRowProps {
  status: DayPlanStatus;
  onLog: (log: Omit<InjectionLog, 'id' | 'createdAt'>) => Promise<void>;
  isTransition: boolean;
}

export function CalendarStatusRow({
  status,
  onLog,
  isTransition,
}: CalendarStatusRowProps) {
  const statusKind = getCalendarStatusKind(status);
  const canOverridePast = status.date <= todayIso() && status.cycleState !== 'upcoming';

  return (
    <div className={`calendar-status-row ${statusKind}`}>
      <div>
        <span className="status-label">{calendarStatusLabel(status)}</span>
        <strong>{status.plan.name}</strong>
        {isTransition && <em>Cycle change</em>}
      </div>
      {canOverridePast && (
        <div className="calendar-actions">
          {!status.completed && (
            <button
              type="button"
              className="primary-button mini"
              onClick={() =>
                void onLog({
                  planId: status.plan.id,
                  date: status.date,
                  status: 'completed',
                  actualDose: status.plan.dose,
                  site: status.plan.injectionSites[0],
                })
              }
            >
              <Check aria-hidden />
              Done
            </button>
          )}
          {!status.skipped && (
            <button
              type="button"
              className="ghost-button mini"
              onClick={() =>
                void onLog({
                  planId: status.plan.id,
                  date: status.date,
                  status: 'skipped',
                  actualDose: status.plan.dose,
                  site: status.plan.injectionSites[0],
                })
              }
            >
              <SkipForward aria-hidden />
              Not done
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function getCalendarStatusKind(status: DayPlanStatus) {
  if (status.completed) return 'done';
  if (status.skipped) return 'skipped';
  if (status.missed) return 'missed';
  if (status.due && status.overdue) return 'due';
  if (status.due) return 'planned';
  if (status.cycleState === 'off') return 'off';
  if (status.cycleState === 'upcoming') return 'upcoming';
  return 'on';
}

function calendarStatusLabel(status: DayPlanStatus) {
  if (status.completed) return 'Done';
  if (status.skipped) return 'Skipped';
  if (status.missed) return 'Missed';
  if (status.due && status.overdue) return 'Due';
  if (status.due) return 'Planned';
  if (status.cycleState === 'off') return 'Off';
  if (status.cycleState === 'upcoming') return 'Starts later';
  return 'On';
}
