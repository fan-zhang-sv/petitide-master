import type { InjectionLog, PlannedPeptide } from '../types'
import { addIsoDays, daysBetween, todayIso } from './dates'
import { isDueByFrequency } from './cycleEngine'

export function createCompletedPastLogs(
  plan: PlannedPeptide,
  makeId: () => string,
  currentDate = todayIso(),
): InjectionLog[] {
  const elapsed = daysBetween(plan.startDate, currentDate)
  if (elapsed <= 0) {
    return []
  }

  return Array.from({ length: elapsed }, (_, offset) => addIsoDays(plan.startDate, offset))
    .filter((date) => isDueByFrequency(plan, date))
    .map((date) => ({
      id: makeId(),
      planId: plan.id,
      date,
      status: 'completed' as const,
      actualDose: plan.dose,
      site: plan.injectionSites[0],
      notes: 'Auto-marked done for days before this plan was added.',
      createdAt: new Date().toISOString(),
    }))
}
