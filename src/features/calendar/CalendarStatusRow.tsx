import { Check, Pause, Power, RotateCcw, SkipForward, X, Calendar, Clock } from 'lucide-react';
import type { DayPlanStatus, InjectionLog } from '../../types';
import { todayIso } from '../../utils/dates';
import { getCycleState } from '../../utils/cycleEngine';
import { Button } from '../../components/ui/Button';
import { StatusLabel } from '../../components/ui/Badge';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

interface CalendarStatusRowProps {
  status: DayPlanStatus;
  onLog: (log: Omit<InjectionLog, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteLog: (planId: string, date: string) => Promise<void>;
}

export function CalendarStatusRow({
  status,
  onLog,
  onDeleteLog,
}: CalendarStatusRowProps) {
  const statusKind = getCalendarStatusKind(status);
  const cycleActive = getCycleState(status.plan, status.date) === 'active';
  const canOverridePast = status.date <= todayIso() && getCycleState(status.plan, status.date) !== 'upcoming';

  const showDoneButton = !status.done && canOverridePast;
  const showUndoButton = status.done;

  const actions = (
    <div className={styles['calendar-actions']}>
      {showDoneButton && (
        <Button
          variant="primary"
          size="mini"
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
        </Button>
      )}
      {showUndoButton && (
        <Button
          variant="ghost"
          size="mini"
          onClick={() => void onDeleteLog(status.plan.id, status.date)}
        >
          <RotateCcw aria-hidden />
          Undo
        </Button>
      )}
    </div>
  );

  return (
    <div className={cx(styles['calendar-status-row'], styles[statusKind])}>
      <div className={styles['calendar-status-main']}>
        <div className={styles['calendar-status-badges']}>
          <StatusLabel tone={cycleActive ? 'on' : 'off'}>
            {cycleActive ? <Power aria-hidden /> : <Pause aria-hidden />}
            {cycleActive ? 'On' : 'Off'}
          </StatusLabel>
          <StatusLabel tone={completionStatusKind(status)}>
            {getCompletionIcon(status)}
            {completionStatusLabel(status)}
          </StatusLabel>
        </div>
        <strong>{status.plan.name}</strong>
      </div>
      {(showDoneButton || showUndoButton) && actions}
    </div>
  );
}

function getCalendarStatusKind(status: DayPlanStatus) {
  if (status.done) {
    return status.log?.status === 'skipped' ? 'skipped' : 'done';
  }
  if (status.date > todayIso()) return 'scheduled';
  if (status.date === todayIso()) return 'pending';
  return status.onTrack ? 'missed' : 'off';
}

function completionStatusKind(status: DayPlanStatus) {
  if (status.done) {
    return status.log?.status === 'skipped' ? 'skipped' : 'done';
  }
  if (status.date > todayIso()) return 'scheduled';
  if (status.date === todayIso()) return 'pending';
  return status.onTrack ? 'missed' : 'off';
}

function completionStatusLabel(status: DayPlanStatus) {
  if (status.done) {
    return status.log?.status === 'skipped' ? 'Skipped' : 'Done';
  }
  if (status.date > todayIso()) return 'Scheduled';
  if (status.date === todayIso()) return 'Due Today';
  return status.onTrack ? 'Missed' : 'Offtrack';
}

function getCompletionIcon(status: DayPlanStatus) {
  if (status.done) {
    return status.log?.status === 'skipped' ? <SkipForward aria-hidden /> : <Check aria-hidden />;
  }
  if (status.date > todayIso()) return <Calendar aria-hidden />;
  if (status.date === todayIso()) return <Clock aria-hidden />;
  return status.onTrack ? <X aria-hidden /> : <Pause aria-hidden />;
}
