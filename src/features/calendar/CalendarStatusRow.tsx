import { Check, Pause, Power, SkipForward, X, Calendar, Clock } from 'lucide-react';
import type { DayPlanStatus, InjectionLog } from '../../types';
import { todayIso } from '../../utils/dates';
import { Button } from '../../components/ui/Button';
import { StatusLabel } from '../../components/ui/Badge';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

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
    <div className={styles['calendar-actions']}>
      {!status.completed && (
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
      {!status.skipped && (
        <Button
          variant="ghost"
          size="mini"
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
        </Button>
      )}
    </div>
  );

  return (
    <div className={cx(styles['calendar-status-row'], styles[statusKind])}>
      <div className={styles['calendar-status-main']}>
        <div className={styles['calendar-status-badges']}>
          <StatusLabel tone={cycleStatusKind(status)}>
            {status.cycleState === 'active' ? <Power aria-hidden /> : <Pause aria-hidden />}
            {cycleStatusLabel(status)}
          </StatusLabel>
          <StatusLabel tone={completionStatusKind(status)}>
            {getCompletionIcon(status)}
            {completionStatusLabel(status)}
          </StatusLabel>
        </div>
        <strong>{status.plan.name}</strong>
      </div>
      {canOverridePast && actions}
    </div>
  );
}

function getCalendarStatusKind(status: DayPlanStatus) {
  if (status.completed) return 'done';
  if (status.skipped) return 'skipped';
  if (status.date > todayIso()) return 'scheduled';
  if (status.date === todayIso()) return 'pending';
  return 'missed';
}

function cycleStatusKind(status: DayPlanStatus) {
  return status.cycleState === 'active' ? 'on' : 'off';
}

function cycleStatusLabel(status: DayPlanStatus) {
  return status.cycleState === 'active' ? 'On' : 'Off';
}

function completionStatusKind(status: DayPlanStatus) {
  if (status.completed) return 'done';
  if (status.skipped) return 'skipped';
  if (status.date > todayIso()) return 'scheduled';
  if (status.date === todayIso()) return 'pending';
  return 'missed';
}

function completionStatusLabel(status: DayPlanStatus) {
  if (status.completed) return 'Done';
  if (status.skipped) return 'Skipped';
  if (status.date > todayIso()) return 'Scheduled';
  if (status.date === todayIso()) return 'Due Today';
  return 'Missed';
}

function getCompletionIcon(status: DayPlanStatus) {
  if (status.completed) return <Check aria-hidden />;
  if (status.skipped) return <SkipForward aria-hidden />;
  if (status.date > todayIso()) return <Calendar aria-hidden />;
  if (status.date === todayIso()) return <Clock aria-hidden />;
  return <X aria-hidden />;
}
