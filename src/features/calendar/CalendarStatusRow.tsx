import { Check, Pause, Power, SkipForward, X } from 'lucide-react';
import type { DayPlanStatus, InjectionLog } from '../../types';
import { todayIso } from '../../utils/dates';

interface CalendarStatusRowProps {
  status: DayPlanStatus;
  onLog: (log: Omit<InjectionLog, 'id' | 'createdAt'>) => Promise<void>;
}

export function CalendarStatusRow({
  status,
  onLog,
}: CalendarStatusRowProps) {
  const statusKind = getCalendarStatusKind(status);
  const canOverridePast = status.date <= todayIso() && status.cycleState !== 'upcoming';
  const actions = (
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
  );

  return (
    <div className={`calendar-status-row ${statusKind}`}>
      <div className="calendar-status-main">
        <div className="calendar-status-badges">
          <span className={`status-label ${cycleStatusKind(status)}`}>
            {status.cycleState === 'active' ? <Power aria-hidden /> : <Pause aria-hidden />}
            {cycleStatusLabel(status)}
          </span>
          <span className={`status-label ${completionStatusKind(status)}`}>
            {status.completed ? <Check aria-hidden /> : <X aria-hidden />}
            {completionStatusLabel(status)}
          </span>
        </div>
        <strong>{status.plan.name}</strong>
      </div>
      {canOverridePast && actions}
    </div>
  );
}

function getCalendarStatusKind(status: DayPlanStatus) {
  if (status.completed) return 'done';
  if (status.due || status.skipped) return 'not-done';
  if (status.cycleState !== 'active') return 'off';
  return 'on';
}

function cycleStatusKind(status: DayPlanStatus) {
  return status.cycleState === 'active' ? 'on' : 'off';
}

function cycleStatusLabel(status: DayPlanStatus) {
  return status.cycleState === 'active' ? 'On' : 'Off';
}

function completionStatusKind(status: DayPlanStatus) {
  return status.completed ? 'done' : 'not-done';
}

function completionStatusLabel(status: DayPlanStatus) {
  return status.completed ? 'Done' : 'Not done';
}
