import { useState, useMemo } from 'react';
import type { PlannedPeptide, InjectionLog } from '../../types';
import { todayIso, addIsoDays, daysBetween } from '../../utils/dates';
import { getStatusesForDate } from '../../utils/cycleEngine';
import { CalendarStatusRow } from './CalendarStatusRow';

interface CalendarViewProps {
  plans: PlannedPeptide[];
  logs: InjectionLog[];
  onLog: (log: Omit<InjectionLog, 'id' | 'createdAt'>) => Promise<void>;
}

export function CalendarView({ plans, logs, onLog }: CalendarViewProps) {
  const [futureDays, setFutureDays] = useState(120);
  const firstPlanDate = useMemo(() => {
    if (plans.length === 0) return todayIso();
    return plans.reduce((earliest, p) => (p.startDate < earliest ? p.startDate : earliest), plans[0].startDate);
  }, [plans]);

  const dates = useMemo(() => {
    const start = firstPlanDate < todayIso() ? firstPlanDate : todayIso();
    const count = daysBetween(start, todayIso()) + futureDays;
    return Array.from({ length: count }, (_, i) => addIsoDays(start, i));
  }, [firstPlanDate, futureDays]);

  const transitions = useMemo(() => {
    return dates.map((date) => {
      const statuses = getStatusesForDate(plans, logs, date);
      const transition = statuses.find((s) => s.nextTransitionDate === date);
      return transition ? { plan: transition.plan, date: transition.nextTransitionDate } : null;
    }).filter(Boolean);
  }, [plans, logs, dates]);

  return (
    <section className="screen">
      <section className="calendar-controls">
        <div className="control-item">
          <span>Starts</span>
          <strong>{firstPlanDate}</strong>
        </div>
        <label>
          Future
          <select value={futureDays} onChange={(event) => setFutureDays(Number(event.target.value))}>
            <option value={60}>60 days ahead</option>
            <option value={120}>120 days ahead</option>
            <option value={240}>240 days ahead</option>
            <option value={365}>1 year ahead</option>
          </select>
        </label>
      </section>

      <section className="transition-strip">
        {transitions.length > 0 ? (
          <div className="transition-badge-row">
            {transitions.map((transition) => (
              <span key={transition!.plan.id} className="transition-badge">
                <strong>{transition!.plan.name}</strong>
                <span>{transition!.date}</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="transition-badge empty">No upcoming transitions</span>
        )}
      </section>

      <section className="calendar-legend" aria-label="Calendar color guide">
        <span className="legend-item due">Due now</span>
        <span className="legend-item done">Done</span>
        <span className="legend-item missed">Missed</span>
        <span className="legend-item on">On cycle</span>
        <span className="legend-item off">Off cycle</span>
        <span className="legend-item transition">Cycle change</span>
      </section>

      <div className="calendar-strip">
        {dates.map((date) => {
          const statuses = getStatusesForDate(plans, logs, date);
          const due = statuses.filter((status) => status.due);
          const off = statuses.filter((status) => status.cycleState === 'off');
          const transitionsToday = transitions.filter((transition) => transition?.date === date);
          return (
            <article
              key={date}
              className={`day-cell ${date === todayIso() ? 'today' : ''} ${off.length && due.length === 0 ? 'off-day' : ''} ${transitionsToday.length ? 'transition-day' : ''}`}
            >
              <div className="day-head">
                <strong>{date.slice(5)}</strong>
                <span>{date === todayIso() ? 'Today' : date}</span>
              </div>
              <div className="calendar-status-list">
                {statuses.length === 0 ? (
                  <span className="empty-day">No plan</span>
                ) : (
                  statuses.map((status) => (
                    <CalendarStatusRow
                      key={status.plan.id}
                      status={status}
                      onLog={onLog}
                      isTransition={transitionsToday.some((transition) => transition?.plan.id === status.plan.id)}
                    />
                  ))
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
