import type { DayPlanStatus, FrequencyConfig, InjectionLog, PlannedPeptide } from '../types'
import { addIsoDays, daysBetween, isPastDate, todayIso } from './dates'

type CycleState = DayPlanStatus['cycleState']

interface EffectiveCycleAnchor {
  cycleStartDate: string
  confidence: 'high' | 'medium' | 'low'
  reason: 'configured' | 'completed-history' | 'skipped-history' | 'gapped-history'
}

export function frequencyLabel(frequency: FrequencyConfig) {
  if (frequency.kind === 'daily') {
    return 'Daily'
  }
  if (frequency.kind === 'weekly') {
    return 'Weekly'
  }
  if (frequency.kind === 'times-per-week') {
    return `${frequency.timesPerWeek ?? 2}x weekly`
  }
  return 'As needed'
}

export function cycleLabel(plan: Pick<PlannedPeptide, 'cycleDays' | 'offDays'>) {
  if (!plan.cycleDays) {
    return 'No fixed cycle'
  }
  if (!plan.offDays) {
    return `${plan.cycleDays} day active plan`
  }
  return `${plan.cycleDays} days on / ${plan.offDays} days off`
}

function getCycleStateFromAnchor(plan: PlannedPeptide, date: string, cycleStartDate: string): CycleState {
  const elapsed = daysBetween(cycleStartDate, date)
  if (elapsed < 0) {
    return 'upcoming'
  }

  if (!plan.cycleDays || plan.cycleDays <= 0) {
    return 'active'
  }

  if (!plan.offDays || plan.offDays <= 0) {
    return elapsed < plan.cycleDays ? 'active' : 'off'
  }

  const cycleLength = plan.cycleDays + plan.offDays
  const position = elapsed % cycleLength
  return position < plan.cycleDays ? 'active' : 'off'
}

export function getCycleState(plan: PlannedPeptide, date: string, logs: InjectionLog[] = []) {
  const anchor = getEffectiveCycleAnchor(plan, logs)
  return getCycleStateFromAnchor(plan, date, anchor.cycleStartDate)
}

function getNextTransitionDateFromAnchor(plan: PlannedPeptide, date: string, cycleStartDate: string) {
  const elapsed = daysBetween(cycleStartDate, date)
  if (elapsed < 0) {
    return cycleStartDate
  }
  if (!plan.cycleDays) {
    return undefined
  }
  if (!plan.offDays) {
    return addIsoDays(cycleStartDate, plan.cycleDays)
  }

  const cycleLength = plan.cycleDays + plan.offDays
  const position = elapsed % cycleLength
  const daysUntilTransition =
    position < plan.cycleDays ? plan.cycleDays - position : cycleLength - position
  return addIsoDays(date, daysUntilTransition)
}

export function getNextTransitionDate(plan: PlannedPeptide, date: string, logs: InjectionLog[] = []) {
  const anchor = getEffectiveCycleAnchor(plan, logs)
  return getNextTransitionDateFromAnchor(plan, date, anchor.cycleStartDate)
}

export function isDueByFrequency(
  plan: PlannedPeptide,
  date: string,
  logs: InjectionLog[] = [],
  currentDate = todayIso(),
) {
  const anchor = getEffectiveCycleAnchor(plan, logs, currentDate)
  if (getCycleStateFromAnchor(plan, date, anchor.cycleStartDate) !== 'active') {
    return false
  }

  const elapsed = daysBetween(anchor.cycleStartDate, date)
  if (elapsed < 0) {
    return false
  }

  if (plan.frequency.kind === 'as-needed') {
    return false
  }
  if (plan.frequency.kind === 'daily') {
    return true
  }
  if (plan.frequency.kind === 'weekly') {
    return elapsed % 7 === 0
  }

  const times = Math.max(1, Math.min(7, plan.frequency.timesPerWeek ?? 2))
  const interval = Math.max(1, Math.round(7 / times))
  return elapsed % interval === 0
}

export function getLogForPlanDate(logs: InjectionLog[], planId: string, date: string) {
  return logs.find((log) => log.planId === planId && log.date === date)
}

export function getEffectiveCycleAnchor(
  plan: PlannedPeptide,
  logs: InjectionLog[] = [],
  currentDate = todayIso(),
): EffectiveCycleAnchor {
  if (!plan.cycleDays || !plan.offDays) {
    return { cycleStartDate: plan.startDate, confidence: 'high', reason: 'configured' }
  }

  const planLogs = logs
    .filter((log) => log.planId === plan.id && log.date <= currentDate)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (planLogs.length === 0) {
    return { cycleStartDate: plan.startDate, confidence: 'high', reason: 'configured' }
  }

  const streaks: Array<{ status: InjectionLog['status']; start: string; end: string; count: number }> = []
  for (const log of planLogs) {
    const last = streaks.at(-1)
    const isContiguous = last ? daysBetween(last.end, log.date) <= 1 : false
    if (last && last.status === log.status && isContiguous) {
      last.end = log.date
      last.count += 1
    } else {
      streaks.push({ status: log.status, start: log.date, end: log.date, count: 1 })
    }
  }

  const latest = streaks.at(-1)
  if (!latest) {
    return { cycleStartDate: plan.startDate, confidence: 'high', reason: 'configured' }
  }

  const hasGap = planLogs.some((log, index) => index > 0 && daysBetween(planLogs[index - 1].date, log.date) > 1)
  const confidence = latest.count >= 2 && !hasGap ? 'high' : latest.count >= 2 ? 'medium' : 'low'

  if (latest.status === 'completed') {
    return {
      cycleStartDate: latest.start,
      confidence,
      reason: hasGap ? 'gapped-history' : 'completed-history',
    }
  }

  const hasCompletedBeforeLatest = streaks
    .slice(0, -1)
    .some((streak) => streak.status === 'completed')

  if (latest.status === 'skipped' && hasCompletedBeforeLatest) {
    return {
      cycleStartDate: addIsoDays(latest.start, -plan.cycleDays),
      confidence,
      reason: hasGap ? 'gapped-history' : 'skipped-history',
    }
  }

  return {
    cycleStartDate: plan.startDate,
    confidence: 'low',
    reason: 'configured',
  }
}

export function getDayPlanStatus(
  plan: PlannedPeptide,
  logs: InjectionLog[],
  date: string,
  currentDate = todayIso(),
): DayPlanStatus {
  const anchor = getEffectiveCycleAnchor(plan, logs, currentDate)
  const cycleState = getCycleStateFromAnchor(plan, date, anchor.cycleStartDate)
  const due = isDueByFrequency(plan, date, logs, currentDate)
  const log = getLogForPlanDate(logs, plan.id, date)
  const completed = log?.status === 'completed'
  const skipped = log?.status === 'skipped'
  const missed = due && !log && isPastDate(date, currentDate)
  const overdue = due && !log && date <= currentDate

  return {
    plan,
    date,
    cycleState,
    due,
    overdue,
    completed,
    skipped,
    missed,
    nextTransitionDate: getNextTransitionDateFromAnchor(plan, date, anchor.cycleStartDate),
    scheduleConfidence: anchor.confidence,
    scheduleAnchorDate: anchor.cycleStartDate,
  }
}

export function getStatusesForDate(
  plans: PlannedPeptide[],
  logs: InjectionLog[],
  date: string,
  currentDate = todayIso(),
) {
  return plans.map((plan) => getDayPlanStatus(plan, logs, date, currentDate))
}

export function getAdherence(plans: PlannedPeptide[], logs: InjectionLog[], currentDate = todayIso()) {
  let completed = 0
  let skipped = 0
  let missed = 0

  plans.forEach((plan) => {
    const elapsed = daysBetween(plan.startDate, currentDate)
    for (let offset = 0; offset < elapsed; offset += 1) {
      const date = addIsoDays(plan.startDate, offset)
      const status = getDayPlanStatus(plan, logs, date, currentDate)
      if (status.completed) {
        completed += 1
      }
      if (status.skipped) {
        skipped += 1
      }
      if (status.missed) {
        missed += 1
      }
    }
  })

  const due = completed + skipped + missed
  const rate = due === 0 ? 0 : Math.round((completed / due) * 100)
  return { due, completed, skipped, missed, rate }
}
