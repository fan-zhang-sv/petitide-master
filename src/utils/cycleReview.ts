import type { InjectionLog, PlannedPeptide } from '../types'
import { addIsoDays, daysBetween, todayIso } from './dates'
import { getCycleState, getEffectiveCycleAnchor, isDueByFrequency } from './cycleEngine'

export type CycleReviewLevel = 'clear' | 'watch' | 'review' | 'urgent-review'

export interface CycleReview {
  level: CycleReviewLevel
  headline: string
  detail: string
  facts: string[]
  baseline?: {
    label: string
    date: string
    confidence: 'high' | 'medium' | 'low'
  }
}

export function analyzeCycleReview(
  plan: PlannedPeptide,
  logs: InjectionLog[],
  currentDate = todayIso(),
): CycleReview {
  const planLogs = logs.filter((log) => log.planId === plan.id)
  const elapsed = daysBetween(plan.startDate, currentDate)
  const cycleState = getCycleState(plan, currentDate, logs)
  const sideEffectLogs = planLogs.filter((log) => log.sideEffects?.trim())
  const completedLogs = planLogs.filter((log) => log.status === 'completed')
  const skippedLogs = planLogs.filter((log) => log.status === 'skipped')
  const effectiveAnchor = getEffectiveCycleAnchor(plan, logs, currentDate)
  const cycleLength = plan.cycleDays && plan.offDays ? plan.cycleDays + plan.offDays : undefined
  const anchorElapsed = daysBetween(effectiveAnchor.cycleStartDate, currentDate)
  const cycleNumber = cycleLength && anchorElapsed >= 0 ? Math.floor(anchorElapsed / cycleLength) : 0
  const currentCycleStart = cycleLength
    ? addIsoDays(effectiveAnchor.cycleStartDate, cycleNumber * cycleLength)
    : effectiveAnchor.cycleStartDate

  if (elapsed < 0) {
    return {
      level: 'clear',
      headline: 'Starts later',
      detail: 'This plan has not reached its start date.',
      facts: [`Start date: ${plan.startDate}`],
      baseline: {
        label: 'Planning baseline: start review',
        date: plan.startDate,
        confidence: 'high',
      },
    }
  }

  if (!plan.cycleDays) {
    return {
      level: sideEffectLogs.length > 0 ? 'urgent-review' : 'watch',
      headline: sideEffectLogs.length > 0 ? 'Review symptoms before continuing' : 'No cycle window set',
      detail:
        sideEffectLogs.length > 0
          ? 'Side-effect notes exist in the log. The app cannot decide whether to continue.'
          : 'Set cycle days in the plan if you want the app to track review windows.',
      facts: [
        `${completedLogs.length} completed log${completedLogs.length === 1 ? '' : 's'}`,
        `${sideEffectLogs.length} side-effect note${sideEffectLogs.length === 1 ? '' : 's'}`,
      ],
    }
  }

  const plannedDueDates = Array.from({ length: elapsed + 1 }, (_, offset) =>
    addIsoDays(plan.startDate, offset),
  ).filter((date) => isDueByFrequency(plan, date, logs))
  const completedDueDates = plannedDueDates.filter((date) =>
    completedLogs.some((log) => log.date === date),
  )
  const missedDueDates = plannedDueDates.filter(
    (date) => !planLogs.some((log) => log.date === date) && date < currentDate,
  )
  const cyclePosition = cycleLength ? Math.max(0, anchorElapsed) % cycleLength : elapsed
  const currentOnWindowDay =
    cycleState === 'active' ? Math.min(plan.cycleDays, cyclePosition + 1) : plan.cycleDays
  const activeWindowProgress = Math.min(100, Math.round((currentOnWindowDay / plan.cycleDays) * 100))
  const daysPastWindow = plan.offDays ? 0 : Math.max(0, elapsed + 1 - plan.cycleDays)
  const adherenceRate =
    plannedDueDates.length === 0 ? 0 : Math.round((completedDueDates.length / plannedDueDates.length) * 100)
  const confidence =
    sideEffectLogs.length > 0 || missedDueDates.length > 0 || skippedLogs.length > 0
      ? ('low' as const)
      : effectiveAnchor.confidence === 'low'
        ? ('low' as const)
        : adherenceRate >= 85
        ? ('high' as const)
        : ('medium' as const)
  const baseline =
    cycleState === 'off' && plan.offDays
      ? {
          label: 'Planning baseline: review restart around',
          date: addIsoDays(currentCycleStart, plan.cycleDays + plan.offDays),
          confidence,
        }
      : {
          label: 'Planning baseline: review off-cycle around',
          date: addIsoDays(currentCycleStart, plan.cycleDays),
          confidence,
        }

  const facts = [
    `${elapsed + 1} calendar day${elapsed === 0 ? '' : 's'} since start`,
    `${activeWindowProgress}% of planned on-window reached`,
    `${adherenceRate}% logged completion for scheduled days`,
  ]

  if (sideEffectLogs.length > 0) {
    return {
      level: 'urgent-review',
      headline: 'Review symptoms before cycle decisions',
      detail:
        'Side-effect notes exist in the log. The app will not recommend continuing, stopping, or switching cycles.',
      facts: [...facts, `${sideEffectLogs.length} side-effect note${sideEffectLogs.length === 1 ? '' : 's'}`],
      baseline,
    }
  }

  if (daysPastWindow > 0 && cycleState === 'active') {
    return {
      level: 'review',
      headline: 'Past planned on-window',
      detail:
        'History shows this plan has run longer than its configured on-cycle window. Review the plan rather than relying on automatic dates.',
      facts: [...facts, `${daysPastWindow} day${daysPastWindow === 1 ? '' : 's'} past planned on-window`],
      baseline,
    }
  }

  if (cycleState === 'off' && completedLogs.some((log) => getCycleState(plan, log.date, logs) === 'off')) {
    return {
      level: 'review',
      headline: 'Logs exist during off-cycle dates',
      detail:
        'History does not match the configured cycle. Review the plan dates before using the calendar as guidance.',
      facts,
      baseline: { ...baseline, confidence: 'low' },
    }
  }

  if (missedDueDates.length > 0 || skippedLogs.length > 0) {
    return {
      level: 'watch',
      headline: 'Calendar reliability is reduced',
      detail:
        'Missed or skipped days can make history-based cycle review less reliable. The app is showing facts only.',
      facts: [
        ...facts,
        `${missedDueDates.length} missed due day${missedDueDates.length === 1 ? '' : 's'}`,
        `${skippedLogs.length} skipped log${skippedLogs.length === 1 ? '' : 's'}`,
      ],
      baseline,
    }
  }

  if (activeWindowProgress >= 90 && cycleState === 'active') {
    return {
      level: 'watch',
      headline: 'Review window approaching',
      detail:
        'This plan is near the configured on-cycle window. The app is not making a medical switch recommendation.',
      facts,
      baseline,
    }
  }

  return {
    level: 'clear',
    headline: 'Within configured tracking window',
    detail: 'No cycle review flags from history. This is not a medical clearance.',
    facts,
    baseline,
  }
}
