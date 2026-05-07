import { useState, useMemo } from 'react';
import { Check, ChevronLeft, ChevronRight, Pause, Power, RotateCcw, X } from 'lucide-react';
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
import { CalendarStatusRow } from './CalendarStatusRow';

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
    <section className="screen">
      <section className="calendar-controls">
        <h2>{monthLabel(selectedMonth)}</h2>
        <div className="calendar-toolbar">
          <div className="month-controls" aria-label="Calendar navigation">
            <button type="button" className="ghost-button small icon-label" onClick={() => changeMonth(previousMonthKey(selectedMonth))}>
              <ChevronLeft aria-hidden />
              Prev
            </button>
            <button type="button" className="ghost-button small icon-label" onClick={() => changeMonth(toMonthKey())}>
              <RotateCcw aria-hidden />
              Today
            </button>
            <button type="button" className="ghost-button small icon-label" onClick={() => changeMonth(nextMonthKey(selectedMonth))}>
              Next
              <ChevronRight aria-hidden />
            </button>
          </div>
        </div>
      </section>

      <section className="calendar-workspace">
        <div className="calendar-month">
          <div className="weekday-row" aria-hidden>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-strip">
            {dates.map((date) => {
              const statuses = getStatusesForDate(plans, logs, date);
              const outsideMonth = date < monthStart || date > monthEnd;
              const summary = summarizeDay(statuses);
              const dayMetrics = getDayMetrics(summary);

              return (
                <article
                  key={date}
                  className={`day-cell ${date === todayIso() ? 'today' : ''} ${date === selectedDate ? 'selected' : ''} ${outsideMonth ? 'outside-month' : ''} ${getCycleClass(summary)}`}
                >
                  <button
                    type="button"
                    className="day-select-button"
                    aria-pressed={date === selectedDate}
                    aria-label={`${date}. ${daySummaryLabel(summary)}`}
                    onClick={() => selectDate(date)}
                  >
                    <div className="day-head">
                      <strong>{date.slice(8)}</strong>
                      {date === todayIso() && <span>Today</span>}
                    </div>
                    {dayMetrics.length > 0 && (
                      <div className="day-status-summary" aria-hidden>
                        {dayMetrics.map((metric) => (
                          <span key={metric.kind} className={`day-status-chip ${metric.kind}`} title={metric.label}>
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

        <aside className="selected-day-panel">
          <div className="section-heading">
            <div>
              <h2>{selectedDate === todayIso() ? 'Today' : selectedDate}</h2>
            </div>
            <span>{selectedStatuses.length} plan{selectedStatuses.length === 1 ? '' : 's'}</span>
          </div>
          <div className="selected-day-list">
            {selectedStatuses.length === 0 ? (
              <p className="muted">No plans on this day.</p>
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
    </section>
  );
}

function summarizeDay(statuses: ReturnType<typeof getStatusesForDate>) {
  const completed = statuses.filter((status) => status.completed).length;
  const notDone = statuses.filter((status) => status.due && !status.completed).length;
  const off = statuses.filter((status) => status.cycleState !== 'active').length;
  const on = statuses.filter((status) => status.cycleState === 'active').length;

  return { completed, notDone, off, on };
}

function getDayMetrics(summary: ReturnType<typeof summarizeDay>) {
  const completion = [
    summary.notDone ? { kind: 'not-done', count: summary.notDone, label: `${summary.notDone} not done` } : null,
    summary.completed ? { kind: 'done', count: summary.completed, label: `${summary.completed} done` } : null,
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
  kind: 'done' | 'not-done' | 'on' | 'off';
  count: number;
  label: string;
};

function DayMetricIcon({ kind }: { kind: DayMetric['kind'] }) {
  if (kind === 'done') return <Check aria-hidden />;
  if (kind === 'not-done') return <X aria-hidden />;
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
    summary.notDone ? `${summary.notDone} not done` : '',
    summary.on ? `${summary.on} on cycle` : '',
    summary.off ? `${summary.off} off cycle` : '',
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'No scheduled status';
}
