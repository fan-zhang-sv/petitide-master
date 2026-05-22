import { useState, useMemo } from 'react';
import { Check, ChevronLeft, ChevronRight, Pause, Power, RotateCcw, X, Calendar, Clock, SkipForward } from 'lucide-react';
import type { PlannedPeptide, InjectionLog } from '../../types';
import {
  getPaddedMonthDates,
  monthEndIso,
  monthLabel,
  monthStartIso,
  nextMonthKey,
  previousMonthKey,
  todayIso,
  toMonthKey,
} from '../../utils/dates';
import { getStatusesForDate } from '../../utils/cycleEngine';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { SectionHeader } from '../../components/ui/Header';
import { CalendarStatusRow } from './CalendarStatusRow';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

interface CalendarViewProps {
  plans: PlannedPeptide[];
  logs: InjectionLog[];
  onLog: (log: Omit<InjectionLog, 'id' | 'createdAt'>) => Promise<void>;
}

export function CalendarView({ plans, logs, onLog }: CalendarViewProps) {
  const [selectedMonth, setSelectedMonth] = useState(toMonthKey());
  const [selectedDate, setSelectedDate] = useState(todayIso());

  const monthStart = monthStartIso(selectedMonth);
  const monthEnd = monthEndIso(selectedMonth);

  const dates = useMemo(() => {
    return getPaddedMonthDates(selectedMonth);
  }, [selectedMonth]);

  const selectedStatuses = getStatusesForDate(plans, logs, selectedDate);

  const changeMonth = (monthKey: string) => {
    setSelectedMonth(monthKey);
    setSelectedDate(toMonthKey(todayIso()) === monthKey ? todayIso() : monthStartIso(monthKey));
  };

  const selectDate = (date: string) => {
    setSelectedDate(date);
    if (toMonthKey(date) !== selectedMonth) {
      setSelectedMonth(toMonthKey(date));
    }
  };

  return (
    <Screen>
      <section className={styles['calendar-controls']}>
        <h2>{monthLabel(selectedMonth)}</h2>
        <div className={styles['calendar-toolbar']}>
          <div className={styles['month-controls']} aria-label="Calendar navigation">
            <Button variant="ghost" size="small" className={styles['icon-label']} onClick={() => changeMonth(previousMonthKey(selectedMonth))}>
              <ChevronLeft aria-hidden />
              Prev
            </Button>
            <Button variant="ghost" size="small" className={styles['icon-label']} onClick={() => changeMonth(toMonthKey())}>
              <RotateCcw aria-hidden />
              Today
            </Button>
            <Button variant="ghost" size="small" className={styles['icon-label']} onClick={() => changeMonth(nextMonthKey(selectedMonth))}>
              Next
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </div>
      </section>

      <section className={styles['calendar-workspace']}>
        <div className={styles['calendar-month']}>
          <div className={styles['weekday-row']} aria-hidden>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className={styles['calendar-strip']}>
            {dates.map((date) => {
              const statuses = getStatusesForDate(plans, logs, date);
              const outsideMonth = date < monthStart || date > monthEnd;
              const summary = summarizeDay(statuses, date);
              const dayMetrics = getDayMetrics(summary);

              return (
                <article
                  key={date}
                  className={cx(
                    styles['day-cell'],
                    date === todayIso() && styles.today,
                    date === selectedDate && styles.selected,
                    outsideMonth && styles['outside-month'],
                    styles[getCycleClass(summary)],
                  )}
                >
                  <button
                    type="button"
                    className={styles['day-select-button']}
                    aria-pressed={date === selectedDate}
                    aria-label={`${date}. ${daySummaryLabel(summary)}`}
                    onClick={() => selectDate(date)}
                  >
                    <div className={styles['day-head']}>
                      <strong>{date.slice(8)}</strong>
                      {date === todayIso() && <span>Today</span>}
                    </div>
                    {dayMetrics.length > 0 && (
                      <div className={styles['day-status-summary']} aria-hidden>
                        {dayMetrics.map((metric) => (
                          <span key={metric.kind} className={cx(styles['day-status-chip'], styles[metric.kind])} title={metric.label}>
                            <DayMetricIcon kind={metric.kind} />
                            <span>{metric.count}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        <aside className={styles['selected-day-panel']}>
          <SectionHeader
            title={selectedDate === todayIso() ? 'Today' : selectedDate}
            meta={`${selectedStatuses.length} plan${selectedStatuses.length === 1 ? '' : 's'}`}
          />
          <div className={styles['selected-day-list']}>
            {selectedStatuses.length === 0 ? (
              <p className={styles.muted}>No plans on this day.</p>
            ) : (
              selectedStatuses.map((status) => (
                <CalendarStatusRow
                  key={`${selectedDate}-${status.plan.id}`}
                  status={status}
                  onLog={onLog}
                />
              ))
            )}
          </div>
        </aside>
      </section>
    </Screen>
  );
}

function summarizeDay(statuses: ReturnType<typeof getStatusesForDate>, date: string, currentDate = todayIso()) {
  const completed = statuses.filter((status) => status.completed).length;
  const skipped = statuses.filter((status) => status.skipped).length;

  let notDone = 0;   // past missed
  let pending = 0;   // today's uncompleted
  let scheduled = 0; // future uncompleted

  statuses.forEach((status) => {
    if (status.due && !status.completed && !status.skipped) {
      if (date < currentDate) {
        notDone += 1;
      } else if (date === currentDate) {
        pending += 1;
      } else {
        scheduled += 1;
      }
    }
  });

  const off = statuses.filter((status) => status.cycleState !== 'active').length;
  const on = statuses.filter((status) => status.cycleState === 'active').length;

  return { completed, skipped, notDone, pending, scheduled, off, on };
}

function getDayMetrics(summary: ReturnType<typeof summarizeDay>) {
  const completion = [
    summary.notDone ? { kind: 'not-done', count: summary.notDone, label: `${summary.notDone} missed` } : null,
    summary.completed ? { kind: 'done', count: summary.completed, label: `${summary.completed} done` } : null,
    summary.skipped ? { kind: 'skipped', count: summary.skipped, label: `${summary.skipped} skipped` } : null,
    summary.pending ? { kind: 'pending', count: summary.pending, label: `${summary.pending} pending` } : null,
    summary.scheduled ? { kind: 'scheduled', count: summary.scheduled, label: `${summary.scheduled} scheduled` } : null,
  ].filter((chip): chip is DayMetric => chip !== null);

  if (completion.length > 0) {
    return completion;
  }

  return [
    summary.on ? { kind: 'on', count: summary.on, label: `${summary.on} on cycle` } : null,
    summary.off ? { kind: 'off', count: summary.off, label: `${summary.off} off cycle` } : null,
  ].filter((chip): chip is DayMetric => chip !== null);
}

type DayMetric = {
  kind: 'done' | 'not-done' | 'skipped' | 'pending' | 'scheduled' | 'on' | 'off';
  count: number;
  label: string;
};

function DayMetricIcon({ kind }: { kind: DayMetric['kind'] }) {
  if (kind === 'done') return <Check aria-hidden />;
  if (kind === 'not-done') return <X aria-hidden />;
  if (kind === 'skipped') return <SkipForward aria-hidden />;
  if (kind === 'pending') return <Clock aria-hidden />;
  if (kind === 'scheduled') return <Calendar aria-hidden />;
  if (kind === 'off') return <Pause aria-hidden />;
  return <Power aria-hidden />;
}

function getCycleClass(summary: ReturnType<typeof summarizeDay>) {
  if (summary.off > 0 && summary.on === 0) return 'off-day';
  if (summary.on > 0 && summary.off > 0) return 'mixed-cycle-day';
  if (summary.on > 0) return 'on-day';
  return '';
}

function daySummaryLabel(summary: ReturnType<typeof summarizeDay>) {
  const parts = [
    summary.completed ? `${summary.completed} done` : '',
    summary.skipped ? `${summary.skipped} skipped` : '',
    summary.notDone ? `${summary.notDone} missed` : '',
    summary.pending ? `${summary.pending} pending` : '',
    summary.scheduled ? `${summary.scheduled} scheduled` : '',
    summary.on ? `${summary.on} on cycle` : '',
    summary.off ? `${summary.off} off cycle` : '',
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'No scheduled status';
}
